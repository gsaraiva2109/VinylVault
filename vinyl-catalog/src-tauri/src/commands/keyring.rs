use keyring::Entry;

const SERVICE: &str = "vinyl-vault";

fn entry(provider: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, &format!("{}-api-key", provider)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_api_key(provider: String, key: String) -> Result<(), String> {
    entry(&provider)?.set_password(&key).map_err(|e| e.to_string())
}

/// Returns the stored key, or None if not set.
pub fn get_api_key(provider: &str) -> Option<String> {
    entry(provider).ok()?.get_password().ok()
}

/// Tauri command: returns true if a key is stored for the given provider.
#[tauri::command]
pub fn check_api_key(provider: String) -> bool {
    get_api_key(&provider).is_some()
}

/// Store auth tokens — used by auth.rs.
pub fn store_token(account: &str, value: &str) -> Result<(), String> {
    Entry::new(SERVICE, account)
        .map_err(|e| e.to_string())?
        .set_password(value)
        .map_err(|e| e.to_string())
}

pub fn load_token(account: &str) -> Option<String> {
    let entry = match Entry::new(SERVICE, account) {
        Ok(e) => e,
        Err(e) => {
            log::error!("[keyring] Failed to create entry for {account}: {e}");
            return None;
        }
    };

    match entry.get_password() {
        Ok(pw) => Some(pw),
        Err(e) => {
            log::error!("[keyring] Failed to read password for {account}: {e}");
            None
        }
    }
}

pub fn delete_token(account: &str) {
    if let Ok(e) = Entry::new(SERVICE, account) {
        let _ = e.delete_credential();
    }
}
