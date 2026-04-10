mod auth;
mod cache;
mod commands;
mod updater;
mod vram;

#[cfg(target_os = "macos")]
mod ocr_macos;

#[cfg(target_os = "linux")]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // On Linux/Wayland, WebKitGTK's GPU compositing path can hold the input focus surface,
    // preventing layer-shell apps (wofi, rofi, fuzzel) from receiving keyboard input.
    // Disabling compositing mode releases the Wayland input grab properly.
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    tauri::Builder::default()
        // ── Plugins ────────────────────────────────────────────────────────
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // ── Managed state ─────────────────────────────────────────────────
        .manage(auth::AuthState::new())
        // ── Setup ──────────────────────────────────────────────────────────
        .setup(|app| {
            // Grant camera/microphone permission requests on Linux (WebKitGTK denies by default)
            #[cfg(target_os = "linux")]
            {
                let webview = app.get_webview_window("main").unwrap();
                let _ = webview.with_webview(|wv| {
                    use webkit2gtk::{PermissionRequestExt, WebViewExt};
                    wv.inner().connect_permission_request(|_, request| {
                        request.allow();
                        true
                    });
                });
            }

            // Start auto-updater (no-op in debug builds)
            updater::start(app.handle().clone());

            Ok(())
        })
        // ── Commands ────────────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            commands::settings::read_settings,
            commands::settings::write_settings,
            commands::keyring::save_api_key,
            commands::keyring::check_api_key,
            commands::recognize::recognize,
            commands::recognize::get_ollama_models,
            commands::llm::get_available_cloud_models,
            auth::start_auth_flow,
            auth::get_access_token,
            auth::sign_out,
            commands::discogs::discogs_get_master,
            commands::spotify::spotify_search,
            commands::scan_log::log_scan_error,
            commands::scan_log::log_scan_success,
            commands::scan_log::read_scan_log,
            commands::scan_log::clear_scan_log,
        ])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Future native teardown logic
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
