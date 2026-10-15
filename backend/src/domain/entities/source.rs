use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookSource {
    pub id: String,
    pub source_type: String,
    pub name: String,
    pub description: Option<String>,
    pub base_url: String,
    pub mirror_urls: Option<String>,
    pub auth_config: Option<String>,
    pub proxy_url: Option<String>,
    pub enabled: i64,
    pub priority: i64,
    pub last_test_ms: i64,
    pub last_test_status: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadTask {
    pub id: String,
    pub source_id: String,
    pub source_type: String,
    pub remote_id: Option<String>,
    pub title: String,
    pub author: Option<String>,
    pub format: Option<String>,
    pub file_size: Option<String>,
    pub cover_url: Option<String>,
    pub cover_color: Option<String>,
    pub download_url: Option<String>,
    pub status: String,
    pub progress: i64,
    pub error_message: Option<String>,
    pub book_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
