/*!
 * LLM vision providers — Ollama, OpenAI, Gemini.
 *
 * Each function receives raw JPEG bytes and base64-encodes them for the
 * respective vision API. No OCR step — the LLM reads the image directly.
 */

use base64::{engine::general_purpose, Engine as _};
use image::imageops::FilterType;
use serde_json::json;

use crate::commands::recognize::RecognitionResult;

// ── Image resize helper ──────────────────────────────────────────────────────

/// Downscales JPEG bytes so neither dimension exceeds `max_dim`.
/// Returns the original bytes if already within bounds or if decoding fails.
fn resize_if_needed(bytes: &[u8], max_dim: u32) -> Vec<u8> {
    if max_dim == 0 {
        return bytes.to_vec();
    }
    let img = match image::load_from_memory(bytes) {
        Ok(i) => i,
        Err(_) => return bytes.to_vec(),
    };
    if img.width() <= max_dim && img.height() <= max_dim {
        return bytes.to_vec();
    }
    let resized = img.resize(max_dim, max_dim, FilterType::Lanczos3);
    let mut buf = Vec::new();
    resized
        .write_to(&mut std::io::Cursor::new(&mut buf), image::ImageFormat::Jpeg)
        .unwrap_or_default();
    if buf.is_empty() { bytes.to_vec() } else { buf }
}

const PROMPT: &str = "You are identifying a vinyl record from its album artwork.\n\
    Examine the cover image and find the artist name and album title text.\n\
    Reply ONLY with valid JSON — no markdown, no code fences, no extra text:\n\
    {\"artist\":\"Artist Name\",\"album\":\"Album Title\"}\n\
    If the record is unidentifiable, reply: {\"artist\":\"unknown\",\"album\":\"unknown\"}";

// ── Response parser ──────────────────────────────────────────────────────────

pub fn parse_llm_response(text: &str) -> Result<(String, String), String> {
    // 1. Try parsing the whole response as JSON
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(text.trim()) {
        let artist = v["artist"].as_str().unwrap_or("").to_string();
        let album = v["album"].as_str().unwrap_or("").to_string();
        if !artist.is_empty() && !album.is_empty() {
            return Ok((artist, album));
        }
    }

    // 2. Extract first embedded {…} substring and try JSON parse
    if let Some(start) = text.find('{') {
        if let Some(end_offset) = text[start..].find('}') {
            let slice = &text[start..=start + end_offset];
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(slice) {
                let artist = v["artist"].as_str().unwrap_or("").to_string();
                let album = v["album"].as_str().unwrap_or("").to_string();
                if !artist.is_empty() && !album.is_empty() {
                    return Ok((artist, album));
                }
            }
        }
    }

    // 3. Try ARTIST: / ALBUM: line format
    let mut artist = String::new();
    let mut album = String::new();
    for line in text.lines() {
        let l = line.trim();
        if let Some(v) = l
            .strip_prefix("artist:")
            .or_else(|| l.strip_prefix("ARTIST:"))
        {
            artist = v.trim().to_string();
        } else if let Some(v) = l
            .strip_prefix("album:")
            .or_else(|| l.strip_prefix("ALBUM:"))
        {
            album = v.trim().to_string();
        }
    }
    if !artist.is_empty() && !album.is_empty() {
        return Ok((artist, album));
    }

    Err(format!("could not parse LLM response: {}", &text[..text.len().min(200)]))
}

// ── Ollama ───────────────────────────────────────────────────────────────────

pub async fn call_ollama(image_bytes: &[u8], model: &str, max_dim: u32) -> Result<RecognitionResult, String> {
    if model.is_empty() {
        return Err("no ollama model configured".into());
    }
    let resized = resize_if_needed(image_bytes, max_dim);
    let b64 = general_purpose::STANDARD.encode(&resized);
    let body = json!({
        "model": model,
        "prompt": PROMPT,
        "images": [b64],
        "stream": false
    });
    let client = reqwest::Client::new();
    let resp = client
        .post("http://localhost:11434/api/generate")
        .json(&body)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| format!("Ollama unavailable: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        // Extract "error" field from JSON body if present
        let detail = serde_json::from_str::<serde_json::Value>(&body)
            .ok()
            .and_then(|v| v["error"].as_str().map(|s| s.to_string()))
            .unwrap_or_else(|| body.chars().take(200).collect::<String>());
        return Err(if detail.is_empty() {
            format!("Ollama error: {status}")
        } else {
            format!("Ollama error: {detail}")
        });
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let text = json["response"]
        .as_str()
        .ok_or("Ollama: missing 'response' field")?;
    let (artist, album) = parse_llm_response(text)?;
    Ok(RecognitionResult {
        artist,
        album,
        confidence: 0.85,
        source: "ollama".into(),
    })
}

// ── OpenAI ───────────────────────────────────────────────────────────────────

pub async fn call_openai(
    image_bytes: &[u8],
    api_key: &str,
    model: &str,
    max_dim: u32,
) -> Result<RecognitionResult, String> {
    let resized = resize_if_needed(image_bytes, max_dim);
    let b64 = general_purpose::STANDARD.encode(&resized);
    let body = json!({
        "model": model,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": format!("data:image/jpeg;base64,{b64}")}}
            ]
        }],
    });
    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("OpenAI unavailable: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("OpenAI error: {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let text = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("OpenAI: unexpected response shape")?;
    let (artist, album) = parse_llm_response(text)?;
    Ok(RecognitionResult {
        artist,
        album,
        confidence: 0.80,
        source: "openai".into(),
    })
}

// ── Gemini ───────────────────────────────────────────────────────────────────

pub async fn call_gemini(
    image_bytes: &[u8],
    api_key: &str,
    model: &str,
    max_dim: u32,
) -> Result<RecognitionResult, String> {
    let resized = resize_if_needed(image_bytes, max_dim);
    let b64 = general_purpose::STANDARD.encode(&resized);
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    );
    let body = json!({
        "contents": [{
            "parts": [
                {"text": PROMPT},
                {"inlineData": {"mimeType": "image/jpeg", "data": b64}}
            ]
        }],
    });
    let client = reqwest::Client::new();

    // Retry up to 3 times on transient errors (503/429). Same pattern as
    // api/src/services/discogs.ts discogsGet() — keep both in sync.
    let max_attempts = 3u32;
    for attempt in 0..max_attempts {
        let resp = client
            .post(&url)
            .json(&body)
            .timeout(std::time::Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| format!("Gemini unavailable: {e}"))?;

        let status = resp.status();

        if (status == reqwest::StatusCode::SERVICE_UNAVAILABLE
            || status == reqwest::StatusCode::TOO_MANY_REQUESTS)
            && attempt < max_attempts - 1
        {
            let backoff = std::time::Duration::from_millis(1500 * (attempt + 1) as u64);
            tokio::time::sleep(backoff).await;
            continue;
        }

        if !status.is_success() {
            let body_text = resp.text().await.unwrap_or_default();
            let detail = serde_json::from_str::<serde_json::Value>(&body_text)
                .ok()
                .and_then(|v| v["error"]["message"].as_str().map(|s| s.to_string()))
                .unwrap_or_else(|| body_text.chars().take(200).collect::<String>());
            return Err(if detail.is_empty() {
                format!("Gemini error: {status}")
            } else {
                format!("Gemini error: {detail}")
            });
        }

        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let text = json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or("Gemini: unexpected response shape")?;
        let (artist, album) = parse_llm_response(text)?;
        return Ok(RecognitionResult {
            artist,
            album,
            confidence: 0.80,
            source: "gemini".into(),
        });
    }

    Err("Gemini error: service unavailable after retries".into())
}

// ── Cloud model list ─────────────────────────────────────────────────────────

/// Returns available vision-capable models for the given cloud provider.
/// Reads the API key from the system keyring — never exposes it to the frontend.
#[tauri::command]
pub async fn get_available_cloud_models(provider: String) -> Result<Vec<String>, String> {
    use serde::Deserialize;

    let client = reqwest::Client::new();

    match provider.as_str() {
        "openai" => {
            let key = crate::commands::keyring::get_api_key("openai")
                .ok_or("No OpenAI API key configured")?;

            #[derive(Deserialize)]
            struct OAModel { id: String }
            #[derive(Deserialize)]
            struct OAResp { data: Vec<OAModel> }

            let resp = client
                .get("https://api.openai.com/v1/models")
                .bearer_auth(&key)
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !resp.status().is_success() {
                return Err(format!("OpenAI API error: {}", resp.status()));
            }

            let data = resp.json::<OAResp>().await.map_err(|e| e.to_string())?;

            let mut models: Vec<String> = data.data.into_iter()
                .map(|m| m.id)
                .filter(|id| {
                    id.starts_with("gpt-4o") ||
                    id.starts_with("gpt-4-turbo") ||
                    id.starts_with("gpt-4-vision") ||
                    id.starts_with("o1") ||
                    id.starts_with("o3") ||
                    id.starts_with("o4")
                })
                .collect();
            models.sort();
            Ok(models)
        }
        "gemini" => {
            let key = crate::commands::keyring::get_api_key("gemini")
                .ok_or("No Gemini API key configured")?;

            #[derive(Deserialize)]
            struct GModel {
                name: String,
                #[serde(rename = "supportedGenerationMethods")]
                supported_generation_methods: Option<Vec<String>>,
            }
            #[derive(Deserialize)]
            struct GResp { models: Vec<GModel> }

            let resp = client
                .get(format!(
                    "https://generativelanguage.googleapis.com/v1beta/models?key={}",
                    key
                ))
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !resp.status().is_success() {
                return Err(format!("Gemini API error: {}", resp.status()));
            }

            let data = resp.json::<GResp>().await.map_err(|e| e.to_string())?;

            let mut models: Vec<String> = data.models.into_iter()
                .filter(|m| {
                    m.supported_generation_methods
                        .as_deref()
                        .unwrap_or_default()
                        .contains(&"generateContent".to_string())
                })
                .map(|m| {
                    m.name.strip_prefix("models/").unwrap_or(&m.name).to_string()
                })
                .filter(|name| name.starts_with("gemini"))
                .collect();
            models.sort();
            Ok(models)
        }
        _ => Err(format!("Unknown provider: {}", provider)),
    }
}
