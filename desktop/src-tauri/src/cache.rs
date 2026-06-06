/*!
 * Scan result cache — SQLite-backed, keyed by blake3 image hash.
 *
 * A 7-day TTL prevents stale results while avoiding redundant LLM calls
 * for covers that have been scanned recently.
 *
 * The SQLite connection is opened once and reused across all lookups/stores.
 */

use once_cell::sync::{Lazy, OnceCell};
use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

use crate::commands::recognize::RecognitionResult;

const TTL_SECS: u64 = 60 * 60 * 24 * 7; // 7 days

fn db_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("app data dir unavailable")
        .join("scan_cache.db")
}

fn image_hash(image_bytes: &[u8]) -> String {
    blake3::hash(image_bytes).to_hex().to_string()
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

static DB_PATH: OnceCell<PathBuf> = OnceCell::new();
static CACHE_DB: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));

fn ensure_initialized(app: &AppHandle) {
    let path = DB_PATH.get_or_init(|| db_path(app));
    let mut guard = CACHE_DB.lock().unwrap();
    if guard.is_none() {
        let conn = Connection::open(path).expect("failed to open cache database");
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS scan_cache (
                hash       TEXT PRIMARY KEY,
                artist     TEXT NOT NULL,
                album      TEXT NOT NULL,
                source     TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );",
        )
        .expect("failed to create cache table");
        *guard = Some(conn);
    }
}

/// Look up a cached scan result. Returns `None` if not found or older than 7 days.
pub fn lookup(app: &AppHandle, image_bytes: &[u8]) -> Option<RecognitionResult> {
    ensure_initialized(app);
    let guard = CACHE_DB.lock().unwrap();
    let conn = guard.as_ref().unwrap();
    let hash = image_hash(image_bytes);
    let cutoff = now_secs().saturating_sub(TTL_SECS) as i64;

    conn.query_row(
        "SELECT artist, album, source FROM scan_cache WHERE hash = ?1 AND created_at > ?2",
        params![hash, cutoff],
        |row| {
            Ok(RecognitionResult {
                artist: row.get(0)?,
                album: row.get(1)?,
                confidence: 1.0,
                source: "cache".into(),
            })
        },
    )
    .ok()
}

/// Store a successful scan result. Silently ignores errors (cache is best-effort).
pub fn store(app: &AppHandle, image_bytes: &[u8], result: &RecognitionResult) {
    ensure_initialized(app);
    let guard = CACHE_DB.lock().unwrap();
    let conn = guard.as_ref().unwrap();
    let hash = image_hash(image_bytes);
    let now = now_secs() as i64;
    let _ = conn.execute(
        "INSERT OR REPLACE INTO scan_cache (hash, artist, album, source, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![hash, result.artist, result.album, result.source, now],
    );
}
