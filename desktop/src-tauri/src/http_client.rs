use once_cell::sync::Lazy;
use reqwest::Client;

pub static CLIENT: Lazy<Client> = Lazy::new(|| {
    Client::builder()
        .user_agent("VinylVault/1.0")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("failed to create HTTP client")
});
