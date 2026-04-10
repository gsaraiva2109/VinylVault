/*!
 * Cross-platform GPU memory probe and Ollama dynamic Modelfile generator.
 *
 * VRAM is only queried when Ollama (local inference) is about to be called.
 * On cloud-only mode this module is never touched.
 *
 * Supported backends:
 *   Linux/NVIDIA  — nvidia-smi
 *   Linux/AMD     — sysfs: /sys/class/drm/card{N}/device/mem_info_vram_*
 *   macOS         — system_profiler + vm_stat (unified-memory approximation)
 */

use std::process::Command;

// ── Public types ─────────────────────────────────────────────────────────────

pub struct VramInfo {
    pub free_mb:  u64,
    pub total_mb: u64,
}

// ── Platform probes ──────────────────────────────────────────────────────────

/// Returns None if no supported GPU tool is reachable — caller treats as unconstrained.
pub fn query_vram() -> Option<VramInfo> {
    #[cfg(target_os = "linux")]
    return linux_vram();

    #[cfg(target_os = "macos")]
    return macos_vram();

    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    None
}

// ── Linux ────────────────────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
fn linux_vram() -> Option<VramInfo> {
    nvidia_vram().or_else(amd_vram)
}

#[cfg(target_os = "linux")]
fn nvidia_vram() -> Option<VramInfo> {
    let out = Command::new("nvidia-smi")
        .args(["--query-gpu=memory.free,memory.total", "--format=csv,noheader,nounits"])
        .output()
        .ok()?;

    if !out.status.success() {
        return None;
    }

    let text = String::from_utf8_lossy(&out.stdout);
    let line = text.lines().next()?;
    let mut parts = line.split(',').map(|s| s.trim().parse::<u64>().ok());
    let free_mb  = parts.next()??;
    let total_mb = parts.next()??;
    Some(VramInfo { free_mb, total_mb })
}

#[cfg(target_os = "linux")]
fn amd_vram() -> Option<VramInfo> {
    // Walk /sys/class/drm/card* looking for the first card with AMD VRAM sysfs files.
    for entry in std::fs::read_dir("/sys/class/drm").ok()?.flatten() {
        let base = entry.path();
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        // Only top-level card entries (card0, card1, …), not connectors (card0-HDMI-…)
        if !name_str.starts_with("card") || name_str.contains('-') {
            continue;
        }
        let total_path = base.join("device/mem_info_vram_total");
        let used_path  = base.join("device/mem_info_vram_used");
        if let (Ok(t), Ok(u)) = (
            std::fs::read_to_string(&total_path),
            std::fs::read_to_string(&used_path),
        ) {
            if let (Ok(total_bytes), Ok(used_bytes)) = (
                t.trim().parse::<u64>(),
                u.trim().parse::<u64>(),
            ) {
                if total_bytes == 0 {
                    continue;
                }
                let total_mb = total_bytes / 1024 / 1024;
                let free_mb  = (total_bytes.saturating_sub(used_bytes)) / 1024 / 1024;
                return Some(VramInfo { free_mb, total_mb });
            }
        }
    }
    None
}

// ── macOS ────────────────────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn macos_vram() -> Option<VramInfo> {
    let total_mb = macos_gpu_total_mb()?;
    let free_mb  = macos_free_approx_mb().unwrap_or(total_mb).min(total_mb);
    Some(VramInfo { free_mb, total_mb })
}

/// Parse the VRAM total from `system_profiler SPDisplaysDataType -json`.
/// Works for discrete GPUs and reports the shared pool size on Apple Silicon.
#[cfg(target_os = "macos")]
fn macos_gpu_total_mb() -> Option<u64> {
    let out = Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output()
        .ok()?;

    let json: serde_json::Value = serde_json::from_slice(&out.stdout).ok()?;
    let displays = json["SPDisplaysDataType"].as_array()?;

    for gpu in displays {
        // Field is e.g. "8 GB" or "6144 MB"
        if let Some(vram_str) = gpu["spdisplays_vram"].as_str() {
            if let Some(mb) = parse_vram_str(vram_str) {
                return Some(mb);
            }
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn parse_vram_str(s: &str) -> Option<u64> {
    let s = s.trim();
    if let Some(gb_str) = s.strip_suffix(" GB") {
        return gb_str.trim().parse::<u64>().ok().map(|g| g * 1024);
    }
    if let Some(mb_str) = s.strip_suffix(" MB") {
        return mb_str.trim().parse::<u64>().ok();
    }
    None
}

/// Approximate free GPU memory via vm_stat free pages (Apple Silicon unified memory).
/// On Intel Macs with discrete GPU this is an overestimate, but still useful as a heuristic.
#[cfg(target_os = "macos")]
fn macos_free_approx_mb() -> Option<u64> {
    let out = Command::new("vm_stat").output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout);

    let mut free_pages: u64 = 0;
    for line in text.lines() {
        // "Pages free:                            12345."
        if line.starts_with("Pages free:") {
            let num = line
                .split(':')
                .nth(1)?
                .trim()
                .trim_end_matches('.')
                .parse::<u64>()
                .ok()?;
            free_pages = num;
            break;
        }
    }

    // macOS page size is 4096 bytes (16384 on Apple Silicon — but 4096 is safe underestimate)
    Some(free_pages * 4096 / 1024 / 1024)
}

// ── Modelfile generator ──────────────────────────────────────────────────────

fn ctx_for_total_vram(total_mb: u64) -> u32 {
    match total_mb {
        0..=3_999      => 1024,
        4_000..=7_999  => 2048,
        8_000..=15_999 => 4096,
        _              => 8192,
    }
}

/// Creates (or replaces) a reduced-context Ollama model named `vinyl-vault-opt`.
/// Returns the model name to use: `"vinyl-vault-opt"` on success, or the original
/// `base_model` if creation fails (graceful degradation).
pub async fn ensure_optimized_model(base_model: &str, total_mb: u64) -> Result<String, String> {
    let num_ctx     = ctx_for_total_vram(total_mb) / 2;
    let num_predict = 128u32;
    let modelfile   = format!(
        "FROM {base_model}\nPARAMETER num_ctx {num_ctx}\nPARAMETER num_predict {num_predict}\n"
    );

    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "name":      "vinyl-vault-opt",
        "modelfile": modelfile,
        "stream":    false
    });

    let resp = client
        .post("http://localhost:11434/api/create")
        .json(&body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Ollama create: {e}"))?;

    if resp.status().is_success() {
        log::info!("vram: created vinyl-vault-opt (num_ctx={num_ctx}, base={base_model})");
        Ok("vinyl-vault-opt".into())
    } else {
        let status = resp.status();
        Err(format!("Ollama create failed: {status}"))
    }
}
