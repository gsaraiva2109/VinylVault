use std::fs::{self, OpenOptions};
use std::io::Write;
use tauri::AppHandle;
use tauri::Manager;

#[tauri::command]
pub fn log_scan_error(app: AppHandle, message: String, context: Option<String>) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let log_dir = data_dir.join("logs");
    fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;

    let log_file = log_dir.join("scan-errors.log");

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
    let ctx = context.unwrap_or_default();
    let line = if ctx.is_empty() {
        format!("[{timestamp}] ERROR: {message}\n")
    } else {
        format!("[{timestamp}] ERROR: {message}\n           context: {ctx}\n")
    };

    OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|e| e.to_string())?
        .write_all(line.as_bytes())
        .map_err(|e| e.to_string())?;

    rotate_log_if_needed(&log_file)?;

    Ok(())
}

fn rotate_log_if_needed(path: &std::path::Path) -> Result<(), String> {
    let content = fs::read_to_string(path).unwrap_or_default();
    let lines: Vec<&str> = content.lines().collect();
    if lines.len() > 500 {
        let trimmed = lines[lines.len() - 400..].join("\n") + "\n";
        fs::write(path, trimmed).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn log_scan_success(app: AppHandle, artist: String, album: String, source: String) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let log_dir = data_dir.join("logs");
    fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;

    let log_file = log_dir.join("scan-errors.log");

    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
    let line = format!("[{timestamp}] OK: \"{artist}\" — \"{album}\" via {source}\n");

    OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|e| e.to_string())?
        .write_all(line.as_bytes())
        .map_err(|e| e.to_string())?;

    rotate_log_if_needed(&log_file)?;

    Ok(())
}

#[tauri::command]
pub fn read_scan_log(app: AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let log_file = data_dir.join("logs").join("scan-errors.log");
    if !log_file.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&log_file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_scan_log(app: AppHandle) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let log_file = data_dir.join("logs").join("scan-errors.log");
    if log_file.exists() {
        fs::write(&log_file, "").map_err(|e| e.to_string())?;
    }
    Ok(())
}
