/*!
 * OIDC PKCE authentication via Authentik — loopback redirect (RFC 8252).
 *
 * Flow:
 * 1. start_auth_flow() — binds a temporary HTTP server on 127.0.0.1:<random-port>
 * 2. Builds auth URL with redirect_uri=http://127.0.0.1:<port>/callback, opens in system browser
 * 3. User authorises → Authentik redirects browser to http://127.0.0.1:<port>/callback?code=...
 * 4. The temporary server catches that request, responds with a "close this tab" page
 * 5. Exchanges code + PKCE verifier for tokens → stored in OS keychain
 * 6. Emits auth:state-changed so the frontend re-checks get_access_token
 */

use openidconnect::{
    core::{CoreClient, CoreProviderMetadata, CoreResponseType},
    AuthenticationFlow, AuthorizationCode, ClientId, ClientSecret, CsrfToken, IssuerUrl, Nonce,
    OAuth2TokenResponse, PkceCodeChallenge, RedirectUrl, RefreshToken, Scope,
    reqwest::async_http_client,
};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use crate::commands::keyring;

const AUTHENTIK_ISSUER: &str = env!("AUTHENTIK_ISSUER");
const CLIENT_ID: &str = env!("AUTHENTIK_CLIENT_ID");
const CLIENT_SECRET: &str = env!("AUTHENTIK_CLIENT_SECRET");
/// Fixed loopback port for the OAuth callback server. Must match the redirect URI registered in Authentik.
const CALLBACK_PORT: u16 = 17823;

/// Managed state — holds the in-flight PKCE verifier between start and callback.
pub struct AuthState {
    pub pending_verifier: Mutex<Option<openidconnect::PkceCodeVerifier>>,
}

impl AuthState {
    pub fn new() -> Self {
        AuthState {
            pending_verifier: Mutex::new(None),
        }
    }
}

async fn build_client(redirect_uri: &str) -> Result<CoreClient, String> {
    let issuer = IssuerUrl::new(AUTHENTIK_ISSUER.into()).map_err(|e| e.to_string())?;
    let meta = CoreProviderMetadata::discover_async(issuer, async_http_client)
        .await
        .map_err(|e| e.to_string())?;
    let client = CoreClient::from_provider_metadata(
        meta,
        ClientId::new(CLIENT_ID.into()),
        Some(ClientSecret::new(CLIENT_SECRET.into())),
    )
    .set_redirect_uri(RedirectUrl::new(redirect_uri.into()).map_err(|e| e.to_string())?);
    Ok(client)
}

/// Returns true if the JWT exp claim is within 60 s of now.
fn is_expiring_soon(token: &str) -> bool {
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};

    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() < 2 {
        return true;
    }
    let Ok(bytes) = URL_SAFE_NO_PAD.decode(parts[1]) else {
        return true;
    };
    let Ok(json) = serde_json::from_slice::<serde_json::Value>(&bytes) else {
        return true;
    };
    let exp = json.get("exp").and_then(|v| v.as_i64()).unwrap_or(0);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    now > exp - 60
}

#[tauri::command]
pub async fn start_auth_flow(app: AppHandle) -> Result<(), String> {
    let redirect_uri = format!("http://127.0.0.1:{}/callback", CALLBACK_PORT);
    let listener = TcpListener::bind(format!("127.0.0.1:{}", CALLBACK_PORT))
        .await
        .map_err(|e| format!("Could not bind callback port {CALLBACK_PORT}: {e}"))?;

    let client = build_client(&redirect_uri).await?;
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    let (auth_url, _csrf, _nonce) = client
        .authorize_url(
            AuthenticationFlow::<CoreResponseType>::AuthorizationCode,
            CsrfToken::new_random,
            Nonce::new_random,
        )
        .add_scope(Scope::new("openid".into()))
        .add_scope(Scope::new("profile".into()))
        .add_scope(Scope::new("email".into()))
        .set_pkce_challenge(pkce_challenge)
        .url();

    {
        let state = app.state::<AuthState>();
        *state.pending_verifier.lock().unwrap() = Some(pkce_verifier);
    }

    // Open the URL in the system browser
    #[allow(deprecated)]
    app.shell()
        .open(auth_url.as_str(), None)
        .map_err(|e| e.to_string())?;

    // Spawn the temporary callback server
    tauri::async_runtime::spawn(async move {
        if let Err(e) = run_callback_server(listener, redirect_uri, app).await {
            log::error!("[auth] callback server error: {}", e);
        }
    });

    Ok(())
}

/// Accepts one HTTP request on the listener, extracts the auth code, exchanges it for tokens.
async fn run_callback_server(
    listener: TcpListener,
    redirect_uri: String,
    app: AppHandle,
) -> Result<(), String> {
    let (mut stream, _) = listener
        .accept()
        .await
        .map_err(|e| e.to_string())?;

    // Read the HTTP request (we only need the first line: "GET /callback?code=...&... HTTP/1.1")
    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
    let request = String::from_utf8_lossy(&buf[..n]);

    // Parse code from "GET /callback?code=XYZ&... HTTP/1.1"
    let code = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))      // "/callback?code=..."
        .and_then(|path| path.split_once('?'))                 // ("...", "code=...")
        .and_then(|(_, qs)| {
            qs.split('&')
                .find(|p| p.starts_with("code="))
                .map(|p| p.trim_start_matches("code=").to_string())
        })
        .ok_or("no code in callback")?;

    // Respond so the browser tab shows a friendly message and can be closed
    let body = "<html><body style='font-family:sans-serif;text-align:center;margin-top:20vh'>\
        <h2>Authorised ✓</h2><p>You can close this tab and return to Vinyl Catalog.</p>\
        </body></html>";
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes()).await;
    drop(stream);

    // Exchange code for tokens
    let verifier = {
        let state = app.state::<AuthState>();
        let mut guard = state.pending_verifier.lock().unwrap();
        guard.take()
    }
    .ok_or("no pending auth flow")?;

    let client = build_client(&redirect_uri).await?;
    let token_resp = client
        .exchange_code(AuthorizationCode::new(code))
        .set_pkce_verifier(verifier)
        .request_async(async_http_client)
        .await
        .map_err(|e| e.to_string())?;

    let access = token_resp.access_token().secret();
    keyring::store_token("access-token", access)?;

    if let Some(refresh) = token_resp.refresh_token() {
        keyring::store_token("refresh-token", refresh.secret())?;
    }

    log::info!("[auth] tokens stored successfully");
    let _ = app.emit("auth:state-changed", serde_json::json!({ "status": "authenticated" }));
    Ok(())
}

#[tauri::command]
pub fn sign_out(app: AppHandle) -> Result<(), String> {
    keyring::delete_token("access-token");
    keyring::delete_token("refresh-token");
    app.emit("auth:state-changed", serde_json::json!({ "status": "unauthenticated" }))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_access_token(_app: AppHandle) -> Result<Option<String>, String> {
    let stored = keyring::load_token("access-token");

    // Fast path: present and not expiring
    if let Some(ref token) = stored {
        if !is_expiring_soon(token) {
            return Ok(stored);
        }
    }

    // Attempt silent refresh using a placeholder redirect URI (not used for refresh)
    let refresh = match keyring::load_token("refresh-token") {
        Some(r) => r,
        None => return Ok(None),
    };

    let client = build_client("http://127.0.0.1/callback").await?;
    let resp = client
        .exchange_refresh_token(&RefreshToken::new(refresh))
        .request_async(async_http_client)
        .await
        .map_err(|e| e.to_string())?;

    let new_access = resp.access_token().secret().to_string();
    keyring::store_token("access-token", &new_access)?;
    if let Some(new_refresh) = resp.refresh_token() {
        keyring::store_token("refresh-token", new_refresh.secret())?;
    }

    Ok(Some(new_access))
}
