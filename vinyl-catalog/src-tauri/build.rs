fn main() {
    println!("cargo:rerun-if-changed=.env");

    // Load .env file and emit cargo:rustc-env= for each var so env!() works.
    // In CI, set these as real environment variables — they take precedence over .env.
    let env_file = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env");
    let file_vars = parse_dot_env(&env_file);

    for var in &["AUTHENTIK_ISSUER", "AUTHENTIK_CLIENT_ID", "AUTHENTIK_CLIENT_SECRET"] {
        println!("cargo:rerun-if-env-changed={var}");

        // Real env var (CI) takes precedence over .env file
        let value = std::env::var(var)
            .ok()
            .or_else(|| file_vars.iter().find(|(k, _)| k == var).map(|(_, v)| v.clone()))
            .unwrap_or_else(|| panic!(
                "Missing required build env var: {var}\n  Set it in src-tauri/.env or as a CI environment variable."
            ));

        println!("cargo:rustc-env={var}={value}");
    }

    tauri_build::build()
}

/// Minimal .env parser — returns (key, value) pairs. No external crate needed.
fn parse_dot_env(path: &std::path::Path) -> Vec<(String, String)> {
    let Ok(content) = std::fs::read_to_string(path) else { return vec![] };
    content.lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') { return None; }
            let (key, val) = line.split_once('=')?;
            let val = val.trim().trim_matches('"').trim_matches('\'');
            Some((key.trim().to_string(), val.to_string()))
        })
        .collect()
}
