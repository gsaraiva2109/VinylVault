mod auth;
mod commands;
mod sidecar;
mod updater;

#[cfg(target_os = "macos")]
mod ocr_macos;

#[cfg(target_os = "linux")]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ────────────────────────────────────────────────────────
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // ── Managed state ─────────────────────────────────────────────────
        .manage(auth::AuthState::new())
        .manage(sidecar::SidecarState::new())
        // ── Setup ──────────────────────────────────────────────────────────
        .setup(|app| {
            // Grant camera/microphone permission requests on Linux (WebKitGTK denies by default)
            #[cfg(target_os = "linux")]
            {
                let webview = app.get_webview_window("main").unwrap();
                let _ = webview.with_webview(|wv| {
                    use webkit2gtk::{PermissionRequestExt, WebViewExt};
                    wv.inner().connect_permission_request(|_, request| {
                        request.allow();
                        true
                    });
                });
            }

            // Start Python sidecar on Linux
            #[cfg(target_os = "linux")]
            sidecar::start(app.handle());

            // Start auto-updater (no-op in debug builds)
            updater::start(app.handle().clone());

            Ok(())
        })
        // ── Commands ────────────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            commands::settings::read_settings,
            commands::settings::write_settings,
            commands::keyring::save_api_key,
            commands::recognize::recognize,
            commands::recognize::get_ollama_models,
            auth::start_auth_flow,
            auth::get_access_token,
            auth::sign_out,
            commands::discogs::discogs_get_master,
            commands::spotify::spotify_search,
        ])
        .on_window_event(|window, event| {
            let _ = &window; // only used on Linux; suppress unused warning on other platforms
            if let tauri::WindowEvent::Destroyed = event {
                // Stop sidecar when the last window closes
                #[cfg(target_os = "linux")]
                sidecar::stop(window.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
