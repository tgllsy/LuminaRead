use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use crate::domain::entities::*;
use crate::domain::traits::BookFilter;
use crate::error::AppResult;

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateBookDto {
    pub title: Option<String>,
    pub author: Option<String>,
    pub category: Option<String>,
    pub library_id: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateProgressDto {
    pub chapter_index: i64,
    pub scroll_offset: f64,
    pub cfi: Option<String>,
    pub percentage: f64,
    #[serde(default, alias = "reading_seconds_delta")]
    pub duration_seconds: Option<i64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateHighlightDto {
    #[serde(default)]
    pub book_id: String,
    pub chapter_index: i64,
    pub chapter_title: Option<String>,
    pub selected_text: String,
    pub paragraph_index: Option<i64>,
    pub start_offset: Option<i64>,
    pub end_offset: Option<i64>,
    pub cfi_range: Option<String>,
    pub style_type: Option<String>,
    pub color: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateBookmarkDto {
    #[serde(default)]
    pub book_id: String,
    pub chapter_index: i64,
    pub chapter_title: Option<String>,
    pub snippet: Option<String>,
    pub percentage: Option<f64>,
    pub scroll_offset: Option<f64>,
}

#[async_trait]
pub trait BookService: Send + Sync {
    async fn get_book_details(&self, id: &str) -> AppResult<Book>;
    async fn list_books(&self, filter: BookFilter) -> AppResult<Vec<Book>>;
    async fn update_book(&self, id: &str, dto: UpdateBookDto) -> AppResult<Book>;
    async fn delete_book(&self, id: &str) -> AppResult<()>;
    async fn get_book_content(&self, id: &str, is_lite: bool, target_chapter: Option<usize>) -> AppResult<Value>;
    async fn get_book_chapter(&self, id: &str, index: usize, bilingual: bool) -> AppResult<Value>;
    async fn get_pdf_meta(&self, id: &str) -> AppResult<Value>;
    async fn get_pdf_page(&self, id: &str, page: usize) -> AppResult<Value>;
    async fn upload_book_raw(&self, filename: String, raw_bytes: Vec<u8>, author: Option<String>, category: Option<String>, lib_id: Option<String>) -> AppResult<Value>;
    async fn init_chunk_upload(&self, filename: String, file_size: i64, author: Option<String>, category: Option<String>, lib_id: Option<String>) -> AppResult<Value>;
    async fn append_chunk(&self, book_id: &str, chunk_index: i64, total_chunks: i64, chunk: Vec<u8>, offset: Option<u64>) -> AppResult<Value>;
    async fn complete_upload(&self, book_id: &str) -> AppResult<Value>;
    async fn fail_upload(&self, book_id: &str, error: &str) -> AppResult<()>;
    async fn get_stats_overview(&self) -> AppResult<Value>;
    async fn record_session(&self, book_id: &str, duration: i64) -> AppResult<Value>;
    async fn reparse_book(&self, id: &str) -> AppResult<Book>;
    async fn reparse_all_books(&self) -> AppResult<Value>;
    async fn render_pdf_page_image(&self, id: &str, page: usize) -> AppResult<Option<PathBuf>>;
    async fn clear_system_cache(&self) -> AppResult<Value>;
}

#[async_trait]
pub trait ReaderService: Send + Sync {
    async fn sync_progress(&self, id: &str, dto: UpdateProgressDto) -> AppResult<ReadingProgress>;
    async fn list_highlights(&self, book_id: Option<&str>, has_note: Option<bool>) -> AppResult<Vec<Highlight>>;
    async fn get_daily_review(&self) -> AppResult<Vec<Highlight>>;
    async fn create_highlight(&self, dto: CreateHighlightDto) -> AppResult<Highlight>;
    async fn update_highlight(&self, id: &str, color: &str, style_type: Option<&str>, note: Option<&str>) -> AppResult<Highlight>;
    async fn delete_highlight(&self, id: &str) -> AppResult<()>;
    async fn list_bookmarks(&self, book_id: &str) -> AppResult<Vec<Bookmark>>;
    async fn create_bookmark(&self, dto: CreateBookmarkDto) -> AppResult<Bookmark>;
    async fn delete_bookmark(&self, id: &str) -> AppResult<()>;
}

#[async_trait]
pub trait LibraryService: Send + Sync {
    async fn list(&self) -> AppResult<Vec<ReadingLibrary>>;
    async fn create(&self, name: String, icon: String, color: String, desc: Option<String>) -> AppResult<ReadingLibrary>;
    async fn update(&self, id: &str, name: String, icon: String, color: String, desc: Option<String>) -> AppResult<ReadingLibrary>;
    async fn delete(&self, id: &str) -> AppResult<()>;
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct UpdateConvFields {
    pub answer_title: Option<String>,
    pub selected_text: Option<String>,
    pub chapter_title: Option<String>,
    pub question: Option<String>,
    pub answer_content: Option<String>,
    pub is_pinned: Option<bool>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct ChatHistoryItemDto {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct CopilotRequestDto {
    #[serde(default)]
    pub mode: String,
    pub book_id: Option<String>,
    pub book_title: Option<String>,
    pub chapter_index: Option<usize>,
    pub current_chapter_index: Option<usize>,
    pub chapter_title: Option<String>,
    pub paragraph_index: Option<usize>,
    pub selected_text: Option<String>,
    pub question: Option<String>,
    pub current_percentage: Option<f64>,
    pub skip_log: Option<bool>,
    pub history: Option<Vec<ChatHistoryItemDto>>,
}

#[async_trait]
pub trait AiService: Send + Sync {
    async fn copilot(&self, req: CopilotRequestDto) -> AppResult<Value>;
    async fn list_conversations(&self, book_id: Option<&str>, q: Option<&str>) -> AppResult<Vec<AiConversation>>;
    async fn create_conversation(&self, conv: AiConversation) -> AppResult<AiConversation>;
    async fn update_conversation(&self, id: &str, fields: UpdateConvFields) -> AppResult<AiConversation>;
    async fn update_pin(&self, id: &str, is_pinned: bool) -> AppResult<()>;
    async fn delete_conversation(&self, id: &str) -> AppResult<()>;
    async fn get_notes_hub(&self, book_id: Option<&str>) -> AppResult<Value>;
}

#[async_trait]
pub trait TtsService: Send + Sync {
    async fn speak(&self, text: &str, voice: Option<&str>) -> AppResult<Value>;
    async fn speak_dual_role(
        &self,
        text: &str,
        narration_voice: Option<&str>,
        dialogue_voice: Option<&str>,
    ) -> AppResult<Value>;
    async fn get_audio(&self, hash: &str) -> AppResult<Option<PathBuf>>;
    fn list_voices(&self) -> Value;
    fn get_config(&self) -> Value;
    fn update_config(&self, val: Value) -> AppResult<()>;
}

#[async_trait]
pub trait DiscoveryService: Send + Sync {
    async fn search_all(&self, q: &str, book_id: Option<&str>, limit: usize) -> AppResult<Value>;
    async fn search_book(&self, book_id: &str, q: &str, limit: usize) -> AppResult<Value>;
    async fn list_sources(&self) -> AppResult<Vec<BookSource>>;
    async fn update_source(
        &self,
        id: &str,
        name: Option<&str>,
        base_url: Option<&str>,
        proxy_url: Option<&str>,
        auth_config: Option<&str>,
        mirror_urls: Option<&str>,
        enabled: Option<i64>,
    ) -> AppResult<BookSource>;
    async fn test_connection(
        &self,
        source_id: Option<&str>,
        base_url: Option<&str>,
        proxy_url: Option<&str>,
    ) -> AppResult<Value>;
    async fn discover_search(
        &self,
        q: &str,
        lang: Option<&str>,
        src_id: Option<&str>,
        format: Option<&str>,
    ) -> AppResult<Value>;
    async fn discover_download(&self, task_dto: Value) -> AppResult<Value>;
    async fn discover_tasks(&self) -> AppResult<Vec<DownloadTask>>;
}
