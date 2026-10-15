use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingProgress {
    pub book_id: String,
    pub chapter_index: i64,
    pub scroll_offset: f64,
    pub cfi: Option<String>,
    pub percentage: f64,
    pub device_name: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Highlight {
    pub id: String,
    pub book_id: String,
    pub chapter_index: i64,
    pub chapter_title: String,
    pub selected_text: String,
    pub paragraph_index: i64,
    pub start_offset: i64,
    pub end_offset: i64,
    pub cfi_range: Option<String>,
    pub style_type: String,
    pub color: String,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub book_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bookmark {
    pub id: String,
    pub book_id: String,
    pub chapter_index: i64,
    pub chapter_title: String,
    pub snippet: Option<String>,
    pub percentage: f64,
    pub scroll_offset: f64,
    pub created_at: String,
}
