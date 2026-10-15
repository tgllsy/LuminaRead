use async_trait::async_trait;
use serde_json::Value;
use crate::domain::entities::*;
use crate::error::AppResult;

#[derive(Default, Debug, Clone)]
pub struct BookFilter {
    pub library_id: Option<String>,
}

#[async_trait]
pub trait BookRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> AppResult<Option<Book>>;
    async fn list(&self, filter: &BookFilter) -> AppResult<Vec<Book>>;
    async fn save(&self, book: &Book, chapters_raw_json: &str) -> AppResult<()>;
    async fn update_meta(&self, book: &Book) -> AppResult<()>;
    async fn update_reading_state(&self, id: &str, status: &str, last_read_at: &str, total_reading_seconds: i64) -> AppResult<()>;
    async fn update_import_status(&self, id: &str, progress: i64, step: &str, status: &str, error: &str) -> AppResult<()>;
    async fn delete(&self, id: &str) -> AppResult<()>;
    async fn get_raw_chapters(&self, id: &str) -> AppResult<Option<String>>;
    async fn get_character_graph(&self, id: &str) -> AppResult<Option<String>>;
    async fn batch_index_paragraphs(
        &self,
        book_id: &str,
        title: &str,
        author: &str,
        cover_color: &str,
        paragraphs: &[(usize, usize, i64, String, String)],
    ) -> AppResult<()>;
    async fn count_all(&self) -> AppResult<(i64, i64)>;
    async fn get_stats_overview(&self) -> AppResult<serde_json::Value>;
    async fn record_session(&self, book_id: &str, duration_seconds: i64) -> AppResult<serde_json::Value>;
}

#[async_trait]
pub trait ReaderRepository: Send + Sync {
    async fn get_progress(&self, book_id: &str) -> AppResult<Option<ReadingProgress>>;
    async fn save_progress(&self, progress: &ReadingProgress) -> AppResult<()>;
    async fn list_highlights(&self, book_id: Option<&str>, has_note: Option<bool>) -> AppResult<Vec<Highlight>>;
    async fn get_daily_review(&self) -> AppResult<Vec<Highlight>>;
    async fn create_highlight(&self, highlight: &Highlight) -> AppResult<()>;
    async fn update_highlight(&self, id: &str, color: &str, style_type: Option<&str>, note: Option<&str>) -> AppResult<Option<Highlight>>;
    async fn delete_highlight(&self, id: &str) -> AppResult<()>;
    async fn list_bookmarks(&self, book_id: &str) -> AppResult<Vec<Bookmark>>;
    async fn create_bookmark(&self, bookmark: &Bookmark) -> AppResult<()>;
    async fn delete_bookmark(&self, id: &str) -> AppResult<()>;
    async fn resolve_paragraph_location(
        &self,
        book_id: &str,
        text_probe: &str,
    ) -> AppResult<Option<(usize, String, usize, Option<String>)>>;
}

#[async_trait]
pub trait LibraryRepository: Send + Sync {
    async fn list(&self) -> AppResult<Vec<ReadingLibrary>>;
    async fn create(&self, lib: &ReadingLibrary) -> AppResult<()>;
    async fn update(&self, id: &str, name: &str, icon: &str, color: &str, desc: Option<&str>) -> AppResult<()>;
    async fn delete(&self, id: &str) -> AppResult<()>;
}

#[async_trait]
pub trait SourceRepository: Send + Sync {
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
    async fn update_source_test_result(&self, id: &str, latency_ms: i64, status: &str) -> AppResult<()>;
    async fn list_tasks(&self) -> AppResult<Vec<DownloadTask>>;
    async fn create_task(&self, task: &DownloadTask) -> AppResult<()>;
    async fn update_task_progress(&self, id: &str, progress: i64, status: &str, error: Option<&str>) -> AppResult<()>;
}

#[async_trait]
pub trait ConversationRepository: Send + Sync {
    async fn list(&self, book_id: Option<&str>, q: Option<&str>) -> AppResult<Vec<AiConversation>>;
    async fn find_by_id(&self, id: &str) -> AppResult<Option<AiConversation>>;
    async fn create(&self, conv: &AiConversation) -> AppResult<()>;
    async fn update(&self, conv: &AiConversation) -> AppResult<()>;
    async fn update_pin(&self, id: &str, is_pinned: bool) -> AppResult<()>;
    async fn delete(&self, id: &str) -> AppResult<()>;
    async fn get_notes_hub(&self, book_id: Option<&str>) -> AppResult<Value>;
}

#[async_trait]
pub trait SearchRepository: Send + Sync {
    async fn search(&self, q: &str, book_id: Option<&str>, limit: usize) -> AppResult<Value>;
}
