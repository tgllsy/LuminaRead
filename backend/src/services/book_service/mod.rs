pub mod content;
pub mod maintenance;
pub mod pdf;

use async_trait::async_trait;
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::config::AppConfig;
use crate::domain::entities::book::Book;
use crate::domain::traits::{BookFilter, BookRepository, ReaderRepository};
use crate::error::{AppResult, DomainError, InfraError};
use crate::services::traits::{BookService, UpdateBookDto};
use crate::services::upload_service::UploadService;

pub struct BookServiceImpl {
    db: crate::infra::db::DbContext,
    repo: Arc<dyn BookRepository>,
    reader_repo: Arc<dyn ReaderRepository>,
    upload_service: UploadService,
    config: AppConfig,
    chapters_cache: Arc<Mutex<HashMap<String, Arc<Vec<Value>>>>>,
}

impl BookServiceImpl {
    pub fn new(
        db: crate::infra::db::DbContext,
        repo: Arc<dyn BookRepository>,
        reader_repo: Arc<dyn ReaderRepository>,
        config: AppConfig,
    ) -> Self {
        let upload_service = UploadService::new(Arc::clone(&repo), config.clone());
        let chapters_cache = Arc::new(Mutex::new(HashMap::new()));

        let cache_clone = Arc::clone(&chapters_cache);
        let repo_clone = Arc::clone(&repo);
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            if let Ok(recent_books) = repo_clone.list(&BookFilter::default()).await {
                for b in recent_books.into_iter().take(5) {
                    if let Ok(Some(raw)) = repo_clone.get_raw_chapters(&b.id).await {
                        let parsed: Vec<Value> = serde_json::from_str(&raw).unwrap_or_default();
                        if !parsed.is_empty() {
                            if let Ok(mut c) = cache_clone.lock() {
                                c.insert(b.id, Arc::new(parsed));
                            }
                        }
                    }
                }
            }
        });

        Self {
            db,
            repo,
            reader_repo,
            upload_service,
            config,
            chapters_cache,
        }
    }

    pub fn get_cached_chapters(&self, book_id: &str) -> Option<Arc<Vec<Value>>> {
        if let Ok(cache) = self.chapters_cache.lock() {
            if let Some(chapters) = cache.get(book_id) {
                if !chapters.is_empty() {
                    return Some(Arc::clone(chapters));
                }
            }
        }
        None
    }

    pub fn get_or_parse_chapters(&self, book_id: &str, raw_json: &str) -> Arc<Vec<Value>> {
        let parsed: Vec<Value> = serde_json::from_str(raw_json).unwrap_or_default();
        let arc = Arc::new(parsed);
        if let Ok(mut cache) = self.chapters_cache.lock() {
            cache.insert(book_id.to_string(), Arc::clone(&arc));
        }
        arc
    }

    pub fn invalidate_cache(&self, book_id: &str) {
        if let Ok(mut cache) = self.chapters_cache.lock() {
            cache.remove(book_id);
        }
    }

    async fn get_full_chapters(&self, id: &str) -> AppResult<Arc<Vec<Value>>> {
        if let Some(cached) = self.get_cached_chapters(id) {
            Ok(cached)
        } else {
            let raw = self.repo.get_raw_chapters(id).await?.unwrap_or_else(|| "[]".into());
            Ok(self.get_or_parse_chapters(id, &raw))
        }
    }
}

#[async_trait]
impl BookService for BookServiceImpl {
    async fn get_book_details(&self, id: &str) -> AppResult<Book> {
        self.repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::BookNotFound(id.to_string()).into())
    }

    async fn list_books(&self, filter: BookFilter) -> AppResult<Vec<Book>> {
        self.repo.list(&filter).await
    }

    async fn update_book(&self, id: &str, dto: UpdateBookDto) -> AppResult<Book> {
        let mut book = self.get_book_details(id).await?;
        if let Some(title) = dto.title { book.title = title; }
        if let Some(author) = dto.author { book.author = author; }
        if let Some(category) = dto.category { book.category = category; }
        if let Some(lib_id) = dto.library_id { book.library_id = lib_id; }
        if let Some(desc) = dto.description { book.description = desc; }
        if let Some(tags) = dto.tags { book.tags = tags; }
        self.repo.update_meta(&book).await?;
        self.invalidate_cache(id);
        Ok(book)
    }

    async fn delete_book(&self, id: &str) -> AppResult<()> {
        self.invalidate_cache(id);
        self.repo.delete(id).await
    }

    async fn get_book_content(&self, id: &str, is_lite: bool, target_chapter: Option<usize>) -> AppResult<Value> {
        let book = self.get_book_details(id).await?;
        let full_chapters = self.get_full_chapters(id).await?;
        content::build_book_content(id, &book, &full_chapters, self.reader_repo.as_ref(), is_lite, target_chapter).await
    }

    async fn get_book_chapter(&self, id: &str, index: usize, bilingual: bool) -> AppResult<Value> {
        let chapters = self.get_full_chapters(id).await?;
        content::build_book_chapter(&self.db, &chapters, index, bilingual).await
    }

    async fn get_pdf_meta(&self, id: &str) -> AppResult<Value> {
        let book = self.get_book_details(id).await?;
        let chapters = self.get_full_chapters(id).await?;
        pdf::resolve_pdf_meta(&book, &self.config.pdf_cache_dir, &chapters).await
    }

    async fn get_pdf_page(&self, id: &str, page: usize) -> AppResult<Value> {
        let meta = self.get_pdf_meta(id).await?;
        let page_text = meta
            .get("pages")
            .and_then(|v| v.as_array())
            .and_then(|arr| {
                arr.iter()
                    .find(|p| p.get("page_num").and_then(|n| n.as_u64()) == Some(page as u64))
                    .or_else(|| arr.get(page.saturating_sub(1)))
            })
            .and_then(|p| p.get("text"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        Ok(serde_json::json!({
            "book_id": id,
            "title": meta.get("title").and_then(|v| v.as_str()).unwrap_or(""),
            "page": page,
            "total_pages": meta.get("total_pages").and_then(|v| v.as_i64()).unwrap_or(1),
            "text": page_text,
        }))
    }

    async fn upload_book_raw(&self, filename: String, raw_bytes: Vec<u8>, author: Option<String>, category: Option<String>, lib_id: Option<String>) -> AppResult<Value> {
        let res = self.upload_service.upload_book_raw(filename, raw_bytes, author, category, lib_id).await?;
        if let Some(bid) = res.get("book").and_then(|b| b.get("id")).and_then(|v| v.as_str()) {
            self.invalidate_cache(bid);
        }
        Ok(res)
    }

    async fn init_chunk_upload(&self, filename: String, file_size: i64, author: Option<String>, category: Option<String>, lib_id: Option<String>) -> AppResult<Value> {
        self.upload_service.init_chunk_upload(filename, file_size, author, category, lib_id).await
    }

    async fn append_chunk(&self, book_id: &str, chunk_index: i64, total_chunks: i64, chunk: Vec<u8>, offset: Option<u64>) -> AppResult<Value> {
        self.upload_service.append_chunk(book_id, chunk_index, total_chunks, chunk, offset).await
    }

    async fn complete_upload(&self, book_id: &str) -> AppResult<Value> {
        let res = self.upload_service.complete_upload(book_id).await?;
        self.invalidate_cache(book_id);
        Ok(res)
    }

    async fn fail_upload(&self, book_id: &str, error: &str) -> AppResult<()> {
        self.upload_service.fail_upload(book_id, error).await
    }

    async fn get_stats_overview(&self) -> AppResult<Value> {
        self.repo.get_stats_overview().await
    }

    async fn record_session(&self, book_id: &str, duration: i64) -> AppResult<Value> {
        self.repo.record_session(book_id, duration).await
    }

    async fn reparse_book(&self, id: &str) -> AppResult<Book> {
        self.invalidate_cache(id);
        let book = self.get_book_details(id).await?;
        maintenance::execute_reparse_book(id, &book, &self.config.covers_dir, &self.config.pdf_cache_dir, self.repo.as_ref()).await
    }

    async fn reparse_all_books(&self) -> AppResult<Value> {
        if let Ok(mut c) = self.chapters_cache.lock() { c.clear(); }
        maintenance::execute_reparse_all_books(self.repo.as_ref(), &self.config.covers_dir, &self.config.pdf_cache_dir).await
    }

    async fn render_pdf_page_image(&self, id: &str, page: usize) -> AppResult<Option<PathBuf>> {
        if id.contains('/') || id.contains('\\') || id.contains("..") {
            return Err(DomainError::ValidationError("非法的书籍 ID".into()).into());
        }
        let book = self.get_book_details(id).await?;
        let pdf_cache = self.config.pdf_cache_dir.clone();
        let book_id = id.to_string();
        let rendered = tokio::task::spawn_blocking(move || {
            pdf::render_page_image(&book.file_path, page, &pdf_cache, &book_id)
        })
        .await
        .map_err(InfraError::JoinError)?;

        Ok(rendered)
    }

    async fn clear_system_cache(&self) -> AppResult<Value> {
        if let Ok(mut c) = self.chapters_cache.lock() { c.clear(); }
        maintenance::clear_system_cache(
            &self.db,
            &self.config.pdf_cache_dir,
            &self.config.tts_cache_dir,
            &self.config.data_dir,
            self.repo.as_ref(),
        )
        .await
    }
}
