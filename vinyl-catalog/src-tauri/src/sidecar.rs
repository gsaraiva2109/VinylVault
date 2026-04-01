/*!
 * Python sidecar management — Linux only.
 *
 * Spawns the PyInstaller-bundled `sidecar` binary via tauri-plugin-shell,
 * then runs a health-check loop (every 5 s) and restarts on failure.
 * If the binary is not present (dev without a PyInstaller build), we skip
 * silently rather than spamming errors.
 */
// The sidecar module is compiled on all platforms (SidecarState is managed
// unconditionally) but the functions are only called on Linux.
#![cfg_attr(not(target_os = "linux"), allow(dead_code))]

use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

pub struct SidecarState {
    child: Mutex<Option<CommandChild>>,
}

impl SidecarState {
    pub fn new() -> Self {
        SidecarState {
            child: Mutex::new(None),
        }
    }
}

pub fn start(app: &AppHandle) {
    if app.shell().sidecar("sidecar").is_err() {
        log::warn!("[sidecar] binary not found — skipping (run `uvicorn main:app --port 8765` manually for dev)");
        return;
    }

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        // If something healthy is already on :8765 (e.g. previous run left a process),
        // adopt it instead of trying to spawn a conflicting second instance.
        if is_healthy().await {
            log::info!("[sidecar] port 8765 already responding — adopting existing process, skipping spawn");
            return;
        }

        if !spawn_sidecar(&app).await {
            // Binary doesn't exist on disk — give up silently, no restart loop
            log::warn!("[sidecar] binary not present — skipping (build with PyInstaller or run uvicorn manually on :8765)");
            return;
        }

        // Give the sidecar 3 s to come up before first real check
        tokio::time::sleep(Duration::from_secs(3)).await;

        let mut consecutive_failures: u32 = 0;
        let mut interval = tokio::time::interval(Duration::from_secs(5));
        loop {
            interval.tick().await;
            if !is_healthy().await {
                consecutive_failures += 1;
                if consecutive_failures >= 3 {
                    log::warn!("[sidecar] gave up after {} consecutive failures — OCR unavailable", consecutive_failures);
                    return;
                }
                log::warn!("[sidecar] health check failed — restarting (attempt {})", consecutive_failures);
                kill_child(&app);
                tokio::time::sleep(Duration::from_secs(2)).await;
                if !spawn_sidecar(&app).await {
                    return;
                }
                // Give it time to start
                tokio::time::sleep(Duration::from_secs(3)).await;
            } else {
                consecutive_failures = 0;
            }
        }
    });
}

/// Returns false if the binary doesn't exist (caller should give up entirely).
async fn spawn_sidecar(app: &AppHandle) -> bool {
    let settings_path = app
        .path()
        .app_data_dir()
        .expect("app data dir")
        .join("settings.json");
    let settings_path_str = settings_path.to_string_lossy().into_owned();

    let sidecar_result = app
        .shell()
        .sidecar("sidecar")
        .map(|cmd| cmd.env("SIDECAR_SETTINGS_PATH", &settings_path_str));

    match sidecar_result {
        Ok(cmd) => match cmd.spawn() {
            Ok((mut rx, child)) => {
                {
                    let state = app.state::<SidecarState>();
                    *state.child.lock().unwrap() = Some(child);
                }

                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_shell::process::CommandEvent;
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(line) => {
                                log::info!("[sidecar] {}", String::from_utf8_lossy(&line))
                            }
                            CommandEvent::Stderr(line) => {
                                log::warn!("[sidecar:err] {}", String::from_utf8_lossy(&line))
                            }
                            CommandEvent::Terminated(status) => {
                                log::info!("[sidecar] exited: {:?}", status);
                                break;
                            }
                            _ => {}
                        }
                    }
                });

                log::info!("[sidecar] started");
                true
            }
            Err(e) => {
                // os error 2 = ENOENT (binary missing) — not worth retrying
                if e.to_string().contains("No such file") || e.to_string().contains("os error 2") {
                    false
                } else {
                    log::error!("[sidecar] spawn failed: {}", e);
                    true // binary exists but spawn failed for another reason; allow restart
                }
            }
        },
        Err(e) => {
            log::warn!("[sidecar] binary not found: {}", e);
            false
        }
    }
}

async fn is_healthy() -> bool {
    reqwest::Client::new()
        .get("http://127.0.0.1:8765/health")
        .timeout(Duration::from_secs(2))
        .send()
        .await
        .is_ok()
}

fn kill_child(app: &AppHandle) {
    let child = {
        let state = app.state::<SidecarState>();
        let mut guard = state.child.lock().unwrap();
        guard.take()
    };
    if let Some(c) = child {
        let _ = c.kill();
    }
}

pub fn stop(app: &AppHandle) {
    kill_child(app);
}
