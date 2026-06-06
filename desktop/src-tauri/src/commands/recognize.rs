use std::future::Future;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::commands::{keyring, llm, settings::read_settings};
use crate::http_client::CLIENT;
use crate::{cache, vram};

// ── Public types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct RecognitionResult {
    pub artist: String,
    pub album: String,
    pub confidence: f32,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModelsResult {
    pub models: Vec<String>,
    pub error: Option<String>,
}

// ── macOS OCR heuristic ──────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn parse_ocr_heuristic(ocr_text: &str) -> RecognitionResult {
    let lines: Vec<&str> = ocr_text
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .collect();

    // ALL-CAPS line → artist
    let artist = lines
        .iter()
        .find(|&&l| {
            l.chars()
                .filter(|c| c.is_alphabetic())
                .all(|c| c.is_uppercase())
        })
        .copied()
        .unwrap_or(lines.first().copied().unwrap_or(""))
        .to_string();

    // Longest remaining line → album
    let album = lines
        .iter()
        .filter(|&&l| l != artist.as_str())
        .max_by_key(|l| l.len())
        .copied()
        .unwrap_or("")
        .to_string();

    RecognitionResult {
        artist,
        album,
        confidence: 0.4,
        source: "ocr-heuristic".into(),
    }
}

// ── Platform fallbacks ───────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn platform_ocr_fallback(image_data: &[u8]) -> Result<RecognitionResult, String> {
    let text = crate::ocr_macos::recognize_text(image_data)?;
    Ok(parse_ocr_heuristic(&text))
}

#[cfg(target_os = "linux")]
async fn platform_ocr_fallback(_image_data: &[u8]) -> Result<RecognitionResult, String> {
    Err("Optical Character Recognition (OCR) fallback is currently unavailable on Linux. Please configure an AI Provider (Ollama or Cloud AI) in Settings.".into())
}

// ── LLM cascade helpers ──────────────────────────────────────────────────────

async fn try_ollama(
    image_data: &[u8],
    model: &str,
    max_dim: u32,
) -> Result<RecognitionResult, String> {
    let effective_model = match vram::query_vram().await {
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
    llm::call_ollama(image_data, &effective_model, max_dim).await
}

async fn try_cloud(
    image_data: &[u8],
    settings: &crate::commands::settings::AppSettings,
) -> Result<RecognitionResult, String> {
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
            llm::call_gemini(image_data, &key, model, max_dim).await
        }
        _ => {
            let key = keyring::get_api_key("openai")
                .ok_or("No OpenAI API key configured. Open Settings → AI Provider.")?;
            let model = if settings.llm.cloud_model.starts_with("gemini") || settings.llm.cloud_model.is_empty() {
                "gpt-4o"
            } else {
                settings.llm.cloud_model.as_str()
            };
            llm::call_openai(image_data, &key, model, max_dim).await
        }
    }
}

// ── Cascade runner ───────────────────────────────────────────────────────────

async fn run_recognition_cascade<F, Fut>(
    app: &AppHandle,
    image_data: &[u8],
    provider: &str,
    ollama_model: &str,
    local_max_dim: u32,
    settings: &crate::commands::settings::AppSettings,
    fallback: F,
) -> Result<RecognitionResult, String>
where
    F: FnOnce() -> Fut,
    Fut: Future<Output = Result<RecognitionResult, String>>,
{
    let result = match provider {
        "local" => try_ollama(image_data, ollama_model, local_max_dim).await,
        "cloud" => try_cloud(image_data, settings).await,
        _ => {
            if let Ok(r) = try_ollama(image_data, ollama_model, local_max_dim).await {
                cache::store(app, image_data, &r);
                return Ok(r);
            }
            if let Ok(r) = try_cloud(image_data, settings).await {
                cache::store(app, image_data, &r);
                return Ok(r);
            }
            fallback().await
        }
    };
    if let Ok(ref r) = result {
        cache::store(app, image_data, r);
    }
    result
}

// ── Tauri command: recognize ─────────────────────────────────────────────────

const MAX_IMAGE_BYTES: usize = 50 * 1024 * 1024; // 50 MB

#[tauri::command]
pub async fn recognize(app: AppHandle, image_data: Vec<u8>, force_provider: Option<String>) -> Result<RecognitionResult, String> {
    if image_data.len() > MAX_IMAGE_BYTES {
        return Err("image too large (max 50 MB)".into());
    }
    if let Some(cached) = cache::lookup(&app, &image_data) {
        return Ok(cached);
    }

    let settings = read_settings(app.clone());
    let provider = force_provider.as_deref()
        .unwrap_or(settings.llm.provider.as_str())
        .to_string();
    let ollama_model   = settings.llm.ollama_model.clone();
    let local_max_dim  = settings.llm.local_max_dim;

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
        let msg = match provider.as_str() {
            "cloud" => "No cloud API key configured. Open Settings → AI Provider to add an OpenAI or Gemini key.",
            "local" => "No Ollama model configured. Open Settings → AI Provider to set up Ollama.",
            _ => "No AI provider configured. Open Settings → AI Provider to set up Ollama or add a cloud API key.",
        };
        return Err(msg.into());
    }

    #[cfg(target_os = "macos")]
    {
        run_recognition_cascade(
            &app, &image_data, &provider, &ollama_model, local_max_dim, &settings,
            || async { platform_ocr_fallback(&image_data) },
        ).await
    }
    #[cfg(target_os = "linux")]
    {
        run_recognition_cascade(
            &app, &image_data, &provider, &ollama_model, local_max_dim, &settings,
            || platform_ocr_fallback(&image_data),
        ).await
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".into())
    }
}

// ── Tauri command: get_ollama_models ─────────────────────────────────────────

#[derive(Deserialize)]
struct OllamaModel {
    name: String,
}

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[tauri::command]
pub async fn get_ollama_models() -> OllamaModelsResult {
    match CLIENT
        .get("http://localhost:11434/api/tags")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(resp) => match resp.json::<OllamaTagsResponse>().await {
            Ok(data) => OllamaModelsResult {
                models: data.models.into_iter().map(|m| m.name).collect(),
                error: None,
            },
            Err(_) => OllamaModelsResult {
                models: vec![],
                error: Some("invalid response".into()),
            },
        },
        Err(_) => OllamaModelsResult {
            models: vec![],
            error: Some("Ollama not running".into()),
        },
    }
}
