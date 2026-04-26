use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrSettings {
    pub enabled: bool,
    pub threshold: f32,
}

fn default_local_max_dim() -> u32 { 512 }
fn default_cloud_max_dim() -> u32 { 1024 }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmSettings {
    pub provider: String,
    pub ollama_model: String,
    pub cloud_provider: String,
    pub cloud_model: String,
    #[serde(default = "default_local_max_dim")]
    pub local_max_dim: u32,
    #[serde(default = "default_cloud_max_dim")]
    pub cloud_max_dim: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub ocr: OcrSettings,
    pub llm: LlmSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            ocr: OcrSettings {
                enabled: true,
                threshold: 0.7,
            },
            llm: LlmSettings {
                provider: "local".into(),
                ollama_model: "".into(),
                cloud_provider: "openai".into(),
                cloud_model: "gpt-4o".into(),
                local_max_dim: 512,
                cloud_max_dim: 1024,
            },
        }
    }
}

fn settings_path(app: &AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .expect("app data dir unavailable")
        .join("settings.json")
}

#[tauri::command]
pub fn read_settings(app: AppHandle) -> AppSettings {
    let path = settings_path(&app);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[tauri::command]
pub fn write_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = settings_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}
