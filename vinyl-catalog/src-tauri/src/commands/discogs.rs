use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct DiscogsMaster {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub year: i64,
    pub genre: String,
    #[serde(rename = "coverImage")]
    pub cover_image: Option<String>,
    #[serde(rename = "lowestPrice")]
    pub lowest_price: Option<f64>,
}

#[derive(Deserialize)]
struct DiscogsArtist {
    name: String,
}

#[derive(Deserialize)]
struct DiscogsImage {
    resource_url: Option<String>,
    uri: Option<String>,
}

#[derive(Deserialize)]
struct DiscogsMasterResponse {
    main_release: Option<serde_json::Value>,
    title: Option<String>,
    artists: Option<Vec<DiscogsArtist>>,
    year: Option<i64>,
    styles: Option<Vec<String>>,
    genres: Option<Vec<String>>,
    images: Option<Vec<DiscogsImage>>,
}

#[tauri::command]
pub async fn discogs_get_master(id: String) -> Result<DiscogsMaster, String> {
    let url = format!("https://api.discogs.com/masters/{}", id);
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .header("User-Agent", "VinylCatalog/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Discogs returned {}", resp.status()));
    }

    let data: DiscogsMasterResponse = resp.json().await.map_err(|e| e.to_string())?;

    let resolved_id = data
        .main_release
        .as_ref()
        .and_then(|v| v.as_i64())
        .map(|n| n.to_string())
        .unwrap_or_else(|| id.clone());

    let artist = data
        .artists
        .as_deref()
        .and_then(|a| a.first())
        .map(|a| {
            // Strip "(N)" disambiguation suffixes that Discogs adds
            let re_end = a.name.rfind(" (");
            if let Some(pos) = re_end {
                if a.name[pos + 2..].ends_with(')') {
                    return a.name[..pos].to_string();
                }
            }
            a.name.clone()
        })
        .unwrap_or_else(|| "Unknown Artist".into());

    let cover_image = data
        .images
        .as_deref()
        .and_then(|imgs| imgs.first())
        .and_then(|img| img.resource_url.clone().or_else(|| img.uri.clone()));

    let genre = data
        .styles
        .as_deref()
        .and_then(|s| s.first())
        .or_else(|| data.genres.as_deref().and_then(|g| g.first()))
        .cloned()
        .unwrap_or_else(|| "Unknown".into());

    Ok(DiscogsMaster {
        id: resolved_id,
        title: data.title.unwrap_or_default(),
        artist,
        year: data.year.unwrap_or(0),
        genre,
        cover_image,
        lowest_price: None,
    })
}
