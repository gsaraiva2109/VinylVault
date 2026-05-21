/*!
 * Auto-tag command — uses the same LLM cascade as `recognize` but with a
 * tag-extraction prompt. Returns a controlled-vocabulary set of genre tags,
 * a mood, an era, and a confidence score.
 *
 * Storage happens on the API side (PATCH /api/vinyls/:id); this command
 * only produces the tags. No SQLite cache — tags are cheap to recompute and
 * the final values are persisted in the user's collection DB anyway.
 */

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::AppHandle;

use crate::commands::{keyring, llm, settings::read_settings};
use crate::vram;

// Keep this vocabulary in sync with api/src/services/tag-vocab.ts — the API
// validates PATCH bodies against the same list. The desktop can also fetch
// /api/tags/vocabulary at runtime to detect drift.
const PROMPT: &str = "You are analyzing a vinyl album cover.\n\
    Reply ONLY with valid JSON — no markdown, no code fences, no extra text:\n\
    {\"genre_tags\":[\"...\"],\"mood\":\"...\",\"era\":\"1970s\",\"confidence\":0.0}\n\
    genre_tags: pick 2-5 from [rock, jazz, electronic, hip-hop, classical, folk, soul, metal, pop, punk, ambient, experimental, world, blues, country, reggae].\n\
    mood: one of [energetic, melancholic, dreamy, aggressive, peaceful, dark, uplifting, nostalgic].\n\
    era: decade in the form \"YYYYs\" (e.g. \"1970s\", \"1980s\").\n\
    confidence: 0.0-1.0 — how sure you are.\n\
    If the image is unidentifiable, reply: {\"genre_tags\":[],\"mood\":\"\",\"era\":\"\",\"confidence\":0.0}";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagResult {
    pub genre_tags: Vec<String>,
    pub mood: String,
    pub era: String,
    pub confidence: f32,
    pub source: String,
}

fn parse_tag_response(text: &str, source: &str) -> Result<TagResult, String> {
    let try_parse = |s: &str| serde_json::from_str::<serde_json::Value>(s).ok();

    // Try the whole response first, then the first { ... } substring.
    let value = try_parse(text.trim()).or_else(|| {
        text.find('{').and_then(|start| {
            text[start..].rfind('}').and_then(|end_off| try_parse(&text[start..=start + end_off]))
        })
    });

    let v = value.ok_or_else(|| format!("auto_tag: unparseable response: {}", &text[..text.len().min(200)]))?;

    let genre_tags = v["genre_tags"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|x| x.as_str().map(String::from)).collect())
        .unwrap_or_default();
    let mood = v["mood"].as_str().unwrap_or("").to_string();
    let era = v["era"].as_str().unwrap_or("").to_string();
    let confidence = v["confidence"].as_f64().unwrap_or(0.0) as f32;

    Ok(TagResult { genre_tags, mood, era, confidence, source: source.into() })
}

// ── Provider calls ────────────────────────────────────────────────────────────

async fn call_ollama_tags(image_bytes: &[u8], model: &str, max_dim: u32) -> Result<TagResult, String> {
    if model.is_empty() {
        return Err("no ollama model configured".into());
    }
    let resized = llm::resize_if_needed(image_bytes, max_dim);
    let b64 = general_purpose::STANDARD.encode(&resized);
    let body = json!({
        "model": model,
        "prompt": PROMPT,
        "images": [b64],
        "stream": false,
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
        return Err(format!("Ollama error: {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let text = json["response"].as_str().ok_or("Ollama: missing 'response' field")?;
    parse_tag_response(text, "ollama")
}

async fn call_openai_tags(image_bytes: &[u8], api_key: &str, model: &str, max_dim: u32) -> Result<TagResult, String> {
    let resized = llm::resize_if_needed(image_bytes, max_dim);
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
    parse_tag_response(text, "openai")
}

async fn call_gemini_tags(image_bytes: &[u8], api_key: &str, model: &str, max_dim: u32) -> Result<TagResult, String> {
    let resized = llm::resize_if_needed(image_bytes, max_dim);
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
            return Err(format!("Gemini error: {status}"));
        }
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let text = json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or("Gemini: unexpected response shape")?;
        return parse_tag_response(text, "gemini");
    }

    Err("Gemini error: service unavailable after retries".into())
}

// ── Cascade ───────────────────────────────────────────────────────────────────

async fn try_ollama_tags(image_data: &[u8], model: &str, max_dim: u32) -> Result<TagResult, String> {
    let effective_model = match vram::query_vram() {
        Some(info) => {
            let ratio = info.free_mb as f64 / info.total_mb as f64;
            if ratio < 0.25 {
                return Err(format!(
                    "VRAM too low ({}/{} MB free) — skipping local inference",
                    info.free_mb, info.total_mb
                ));
            } else if ratio < 0.50 {
                vram::ensure_optimized_model(model, info.total_mb)
                    .await
                    .unwrap_or_else(|_| model.to_string())
            } else {
                model.to_string()
            }
        }
        None => model.to_string(),
    };
    call_ollama_tags(image_data, &effective_model, max_dim).await
}

async fn try_cloud_tags(
    image_data: &[u8],
    settings: &crate::commands::settings::AppSettings,
) -> Result<TagResult, String> {
    let max_dim = settings.llm.cloud_max_dim;
    match settings.llm.cloud_provider.as_str() {
        "gemini" => {
            let key = keyring::get_api_key("gemini")
                .ok_or("No Gemini API key configured. Open Settings → AI Provider.")?;
            let model = if settings.llm.cloud_model.starts_with("gemini") && !settings.llm.cloud_model.is_empty() {
                settings.llm.cloud_model.as_str()
            } else {
                "gemini-2.5-flash"
            };
            call_gemini_tags(image_data, &key, model, max_dim).await
        }
        _ => {
            let key = keyring::get_api_key("openai")
                .ok_or("No OpenAI API key configured. Open Settings → AI Provider.")?;
            let model = if settings.llm.cloud_model.starts_with("gemini") || settings.llm.cloud_model.is_empty() {
                "gpt-4o"
            } else {
                settings.llm.cloud_model.as_str()
            };
            call_openai_tags(image_data, &key, model, max_dim).await
        }
    }
}

// ── Tauri command ─────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn auto_tag(
    app: AppHandle,
    image_data: Vec<u8>,
    force_provider: Option<String>,
) -> Result<TagResult, String> {
    let settings = read_settings(app);
    let provider = force_provider.as_deref().unwrap_or(settings.llm.provider.as_str()).to_string();
    let ollama_model = settings.llm.ollama_model.clone();
    let local_max_dim = settings.llm.local_max_dim;

    let has_ollama = !ollama_model.is_empty();
    let has_cloud = match settings.llm.cloud_provider.as_str() {
        "gemini" => keyring::get_api_key("gemini").is_some(),
        _ => keyring::get_api_key("openai").is_some(),
    };
    let any_ai_available = match provider.as_str() {
        "local" => has_ollama,
        "cloud" => has_cloud,
        _ => has_ollama || has_cloud,
    };
    if !any_ai_available {
        return Err("No AI provider configured. Open Settings → AI Provider.".into());
    }

    match provider.as_str() {
        "local" => try_ollama_tags(&image_data, &ollama_model, local_max_dim).await,
        "cloud" => try_cloud_tags(&image_data, &settings).await,
        _ => {
            if let Ok(r) = try_ollama_tags(&image_data, &ollama_model, local_max_dim).await {
                return Ok(r);
            }
            try_cloud_tags(&image_data, &settings).await
        }
    }
}
