use serde::{Deserialize, Serialize};

use crate::commands::keyring;

#[derive(Serialize)]
pub struct SpotifySearchResult {
    #[serde(rename = "albumId")]
    pub album_id: String,
    #[serde(rename = "albumUrl")]
    pub album_url: Option<String>,
    #[serde(rename = "previewUrl")]
    pub preview_url: Option<String>,
}

#[derive(Deserialize)]
struct SpotifyTokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
struct SpotifyImage {
    url: String,
}

#[derive(Deserialize)]
struct SpotifyAlbumExternalUrls {
    spotify: Option<String>,
}

#[derive(Deserialize)]
struct SpotifyAlbum {
    id: String,
    external_urls: Option<SpotifyAlbumExternalUrls>,
    images: Option<Vec<SpotifyImage>>,
}

#[derive(Deserialize)]
struct SpotifyAlbums {
    items: Vec<SpotifyAlbum>,
}

#[derive(Deserialize)]
struct SpotifySearchResponse {
    albums: Option<SpotifyAlbums>,
}

#[tauri::command]
pub async fn spotify_search(q: String) -> Result<SpotifySearchResult, String> {
    let client_id = keyring::get_api_key("spotify-client-id")
        .ok_or("Spotify client ID not configured. Use save_api_key('spotify-client-id', '...') to set it.")?;
    let client_secret = keyring::get_api_key("spotify-client-secret")
        .ok_or("Spotify client secret not configured. Use save_api_key('spotify-client-secret', '...') to set it.")?;

    let client = reqwest::Client::new();

    // Step 1: Get access token via client credentials
    use base64::{engine::general_purpose::STANDARD, Engine};
    let credentials = STANDARD.encode(format!("{}:{}", client_id, client_secret));

    let token_resp: SpotifyTokenResponse = client
        .post("https://accounts.spotify.com/api/token")
        .header("Authorization", format!("Basic {}", credentials))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body("grant_type=client_credentials")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|_| "Failed to authenticate with Spotify")?;

    // Step 2: Search for the album
    let search_url = format!(
        "https://api.spotify.com/v1/search?q={}&type=album&limit=1",
        urlencoding::encode(&q)
    );

    let search_resp: SpotifySearchResponse = client
        .get(&search_url)
        .header("Authorization", format!("Bearer {}", token_resp.access_token))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let album = search_resp
        .albums
        .and_then(|a| a.items.into_iter().next())
        .ok_or("No matching Spotify album found")?;

    Ok(SpotifySearchResult {
        album_id: album.id,
        album_url: album.external_urls.and_then(|u| u.spotify),
        preview_url: album.images.and_then(|imgs| imgs.into_iter().next().map(|i| i.url)),
    })
}
