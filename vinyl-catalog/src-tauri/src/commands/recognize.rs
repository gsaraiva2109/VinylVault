use serde::{Deserialize, Serialize};

use crate::commands::keyring;

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

// ── macOS: Vision.framework via objc2-vision ────────────────────────────────

#[cfg(target_os = "macos")]
fn recognize_via_vision(image_data: &[u8]) -> Result<RecognitionResult, String> {
    crate::ocr_macos::recognize_text(image_data).map(|text| RecognitionResult {
        artist: text.clone(),
        album: text,
        confidence: 1.0,
        source: "vision".into(),
    })
}

// ── Shared Tauri command ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn recognize(image_data: Vec<u8>) -> Result<RecognitionResult, String> {
    #[cfg(target_os = "macos")]
    {
        recognize_via_vision(&image_data)
    }
    #[cfg(target_os = "linux")]
    {
        call_sidecar_recognize(&image_data).await
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".into())
    }
}

#[tauri::command]
pub async fn get_ollama_models() -> OllamaModelsResult {
    let client = reqwest::Client::new();
    match client
        .get("http://127.0.0.1:8765/ollama/models")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(resp) => resp
            .json::<OllamaModelsResult>()
            .await
            .unwrap_or_else(|_| OllamaModelsResult {
                models: vec![],
                error: Some("invalid response".into()),
            }),
        Err(_) => OllamaModelsResult {
            models: vec![],
            error: Some("sidecar unavailable".into()),
        },
    }
}
