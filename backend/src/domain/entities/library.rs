use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingLibrary {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub description: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
    #[serde(default)]
    pub book_count: i64,
}
