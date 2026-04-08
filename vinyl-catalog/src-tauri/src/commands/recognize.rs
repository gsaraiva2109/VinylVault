use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::commands::{keyring, llm, settings::read_settings};

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
async fn platform_ocr_fallback(image_data: &[u8]) -> Result<RecognitionResult, String> {
    call_sidecar_recognize(image_data).await
}

// ── Linux: delegate to the RapidOCR Python sidecar ─────────────────────────

#[cfg(target_os = "linux")]
async fn call_sidecar_recognize(image_data: &[u8]) -> Result<RecognitionResult, String> {
    let openai_key = keyring::get_api_key("openai");
    let gemini_key = keyring::get_api_key("gemini");

    let client = reqwest::Client::new();
    let mut form = reqwest::multipart::Form::new().part(
        "image",
        reqwest::multipart::Part::bytes(image_data.to_vec())
            .file_name("frame.jpg")
            .mime_str("image/jpeg")
            .map_err(|e| e.to_string())?,
    );

    if let Some(key) = openai_key {
        form = form.text("openaiApiKey", key);
    }
    if let Some(key) = gemini_key {
        form = form.text("geminiApiKey", key);
    }

    let resp = client
        .post("http://127.0.0.1:8765/recognize")
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    resp.json::<RecognitionResult>()
        .await
        .map_err(|e| e.to_string())
}

// ── LLM cascade helpers ──────────────────────────────────────────────────────

async fn try_ollama(
    image_data: &[u8],
    model: &str,
) -> Result<RecognitionResult, String> {
    llm::call_ollama(image_data, model).await
}

async fn try_cloud(
    image_data: &[u8],
    settings: &crate::commands::settings::AppSettings,
) -> Result<RecognitionResult, String> {
    match settings.llm.cloud_provider.as_str() {
        "gemini" => {
            let key = keyring::get_api_key("gemini")
                .ok_or("No Gemini API key configured. Open Settings → AI Provider.")?;
            // Guard: use a safe default if the stored model looks like an OpenAI model
            let model = if settings.llm.cloud_model.starts_with("gemini") && !settings.llm.cloud_model.is_empty() {
                settings.llm.cloud_model.as_str()
            } else {
                "gemini-2.5-flash"
            };
            llm::call_gemini(image_data, &key, model).await
        }
        _ => {
            // default: openai
            let key = keyring::get_api_key("openai")
                .ok_or("No OpenAI API key configured. Open Settings → AI Provider.")?;
            // Guard: use a safe default if the stored model looks like a Gemini model
            let model = if settings.llm.cloud_model.starts_with("gemini") || settings.llm.cloud_model.is_empty() {
                "gpt-4o"
            } else {
                settings.llm.cloud_model.as_str()
            };
            llm::call_openai(image_data, &key, model).await
        }
    }
}

// ── Tauri command: recognize ─────────────────────────────────────────────────

#[tauri::command]
pub async fn recognize(app: AppHandle, image_data: Vec<u8>, force_provider: Option<String>) -> Result<RecognitionResult, String> {
    let settings = read_settings(app);
    let provider = force_provider.as_deref()
        .unwrap_or(settings.llm.provider.as_str())
        .to_string();
    let ollama_model = settings.llm.ollama_model.clone();

    // Guard: check that at least one AI provider is actually configured
    let has_ollama = !ollama_model.is_empty();
    let has_cloud = match settings.llm.cloud_provider.as_str() {
        "gemini" => keyring::get_api_key("gemini").is_some(),
        _ => keyring::get_api_key("openai").is_some(),
    };
    let any_ai_available = match provider.as_str() {
        "local" => has_ollama,
        "cloud" => has_cloud,
        _ => has_ollama || has_cloud, // "auto"
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
        match provider.as_str() {
            // Explicit provider choices: return the result directly (success or error).
            "local" => try_ollama(&image_data, &ollama_model).await,
            "cloud" => try_cloud(&image_data, &settings).await,
            // "auto": try everything in order, Vision OCR as last resort
            _ => {
                if let Ok(r) = try_ollama(&image_data, &ollama_model).await {
                    return Ok(r);
                }
                if let Ok(r) = try_cloud(&image_data, &settings).await {
                    return Ok(r);
                }
                platform_ocr_fallback(&image_data)
            }
        }
    }
    #[cfg(target_os = "linux")]
    {
        match provider.as_str() {
            // Explicit provider choices: return the result directly (success or error).
            // Do NOT fall back to OCR sidecar — that would hide the real failure reason.
            "local" => try_ollama(&image_data, &ollama_model).await,
            "cloud" => try_cloud(&image_data, &settings).await,
            // "auto": try everything in order, OCR sidecar as last resort
            _ => {
                if let Ok(r) = try_ollama(&image_data, &ollama_model).await {
                    return Ok(r);
                }
                if let Ok(r) = try_cloud(&image_data, &settings).await {
                    return Ok(r);
                }
                platform_ocr_fallback(&image_data).await
            }
        }
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
    let client = reqwest::Client::new();
    match client
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
