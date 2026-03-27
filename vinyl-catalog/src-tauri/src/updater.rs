/*!
 * Auto-updater — wraps tauri-plugin-updater.
 *
 * Behaviour:
 * - Skipped in debug builds
 * - Checks for update 10 s after startup, then every 4 hours
 * - Downloads and installs silently; restart required to apply
 */

use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

const CHECK_INTERVAL: Duration = Duration::from_secs(4 * 60 * 60);

pub fn start(app: AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }
    tauri::async_runtime::spawn(async move {
        // Give the app a moment to finish startup
        tokio::time::sleep(Duration::from_secs(10)).await;
        check_once(&app).await;

        let mut interval = tokio::time::interval(CHECK_INTERVAL);
        interval.tick().await; // skip immediate first tick
        loop {
            interval.tick().await;
            check_once(&app).await;
        }
    });
}

async fn check_once(app: &AppHandle) {
    log::info!("[updater] checking for updates…");
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => {
                log::info!("[updater] update available: v{}", update.version);
                if let Err(e) = update.download_and_install(|_, _| {}, || {}).await {
                    log::error!("[updater] install failed: {}", e);
                } else {
                    log::info!("[updater] update installed — restart to apply");
                }
            }
            Ok(None) => log::info!("[updater] up to date"),
            Err(e) => log::warn!("[updater] check failed: {}", e),
        },
        Err(e) => log::warn!("[updater] updater unavailable: {}", e),
    }
}
