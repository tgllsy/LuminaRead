use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConversation {
    pub id: String,
    pub book_id: Option<String>,
    pub book_title: String,
    pub book_author: Option<String>,
    pub cover_color: Option<String>,
    pub chapter_index: i64,
    pub chapter_title: Option<String>,
    pub paragraph_index: i64,
    pub selected_text: Option<String>,
    pub mode: String,
    pub question: String,
    pub answer_title: String,
    pub answer_content: String,
    pub engine: Option<String>,
    pub follow_ups_json: Option<String>,
    pub is_pinned: bool,
    pub saved_highlight_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl AiConversation {
    pub fn to_json(&self) -> serde_json::Value {
        let follow_ups: Vec<String> = self
            .follow_ups_json
            .as_deref()
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or_default();
        let mut val = serde_json::to_value(self).unwrap_or_default();
        if let Some(map) = val.as_object_mut() {
            map.insert("follow_ups".to_string(), serde_json::to_value(follow_ups).unwrap_or_default());
        }
        val
    }
}
