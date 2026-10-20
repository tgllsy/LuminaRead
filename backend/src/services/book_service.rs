use async_trait::async_trait;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use crate::config::AppConfig;
use crate::domain::entities::book::Book;
use crate::domain::traits::{BookFilter, BookRepository, ReaderRepository};
use crate::error::{AppResult, DomainError};
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
    pub fn new(db: crate::infra::db::DbContext, repo: Arc<dyn BookRepository>, reader_repo: Arc<dyn ReaderRepository>, config: AppConfig) -> Self {
        let upload_service = UploadService::new(Arc::clone(&repo), config.clone());
        let chapters_cache = Arc::new(Mutex::new(HashMap::new()));

        let cache_clone = Arc::clone(&chapters_cache);
        let repo_clone = Arc::clone(&repo);
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            if let Ok(recent_books) = repo_clone.list(&crate::domain::traits::BookFilter::default()).await {
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
        if let Some(cached) = self.get_cached_chapters(book_id) {
            return cached;
        }
        let parsed: Vec<Value> = serde_json::from_str(raw_json).unwrap_or_default();
        let arc = Arc::new(parsed);
        if !arc.is_empty() {
            if let Ok(mut cache) = self.chapters_cache.lock() {
                if cache.len() >= 40 {
                    if let Some(oldest) = cache.keys().next().cloned() {
                        cache.remove(&oldest);
                    }
                }
                cache.insert(book_id.to_string(), Arc::clone(&arc));
            }
        }
        arc
    }

    pub fn invalidate_cache(&self, book_id: &str) {
        if let Ok(mut cache) = self.chapters_cache.lock() {
            cache.remove(book_id);
        }
    }
}

#[async_trait]
impl BookService for BookServiceImpl {
    async fn get_book_details(&self, id: &str) -> AppResult<Book> {
        let mut book = self.repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| DomainError::BookNotFound(id.to_string()))?;

        if book.chapters_count == 0
            && book.status != crate::domain::entities::book::BookStatus::Importing
            && book.status != crate::domain::entities::book::BookStatus::Failed
        {
            if let Ok(Some(raw)) = self.repo.get_raw_chapters(id).await {
                let chs = self.get_or_parse_chapters(id, &raw);
                book.chapters_count = chs.len();
            }
        }
        Ok(book)
    }

    async fn list_books(&self, filter: BookFilter) -> AppResult<Vec<Book>> {
        self.repo.list(&filter).await
    }

    async fn update_book(&self, id: &str, dto: UpdateBookDto) -> AppResult<Book> {
        let mut book = self.get_book_details(id).await?;
        if let Some(t) = dto.title {
            if t.trim().is_empty() {
                return Err(DomainError::ValidationError("书名不能为空".into()).into());
            }
            book.title = t;
        }
        if let Some(a) = dto.author { book.author = a; }
        if let Some(c) = dto.category { book.category = c; }
        if let Some(l) = dto.library_id { book.library_id = l; }
        if let Some(d) = dto.description { book.description = d; }
        if let Some(tags) = dto.tags { book.tags = tags; }

        self.repo.update_meta(&book).await?;
        Ok(book)
    }

    async fn delete_book(&self, id: &str) -> AppResult<()> {
        if let Ok(Some(book)) = self.repo.find_by_id(id).await {
            if !book.file_path.is_empty() {
                let _ = tokio::fs::remove_file(&book.file_path).await;
            }
            if let Some(rel) = book.cover_url.strip_prefix("/data/covers/") {
                let _ = tokio::fs::remove_file(self.config.covers_dir.join(rel)).await;
            }

            // 清理随书解压提取到 covers_dir 下的章节正文配图 (含 epub_img_, epub_b64_, pdf_img_, mobi_img_)
            if let Ok(Some(raw_json)) = self.repo.get_raw_chapters(id).await {
                let covers_dir = self.config.covers_dir.clone();
                let _ = tokio::task::spawn_blocking(move || {
                    for mat in raw_json.split("/data/covers/").skip(1) {
                        if let Some(end) = mat.find(|c: char| c == ']' || c == '"' || c == '\'' || c == ' ' || c == '\n') {
                            let filename = mat[..end].trim();
                            if filename.starts_with("epub_img_")
                                || filename.starts_with("epub_b64_")
                                || filename.starts_with("pdf_img_")
                                || filename.starts_with("mobi_img_")
                            {
                                let img_path = covers_dir.join(filename);
                                let _ = std::fs::remove_file(img_path);
                            }
                        }
                    }
                })
                .await;
            }
        }
        let pdf_dir = self.config.pdf_cache_dir.join(id);
        let _ = tokio::fs::remove_dir_all(pdf_dir).await;
        self.invalidate_cache(id);
        self.repo.delete(id).await
    }

    async fn get_book_content(&self, id: &str, is_lite: bool, target_chapter: Option<usize>) -> AppResult<Value> {
        let book = self.get_book_details(id).await?;
        let full_chapters = if let Some(cached) = self.get_cached_chapters(id) {
            cached
        } else {
            let raw = self.repo.get_raw_chapters(id).await?.unwrap_or_else(|| "[]".into());
            self.get_or_parse_chapters(id, &raw)
        };

        let progress = self.reader_repo.get_progress(id).await?.unwrap_or_else(|| {
            crate::domain::entities::reader::ReadingProgress {
                book_id: id.to_string(),
                chapter_index: 0,
                scroll_offset: 0.0,
                cfi: Some("epubcfi(/6/2!/4/2)".to_string()),
                percentage: 0.0,
                device_name: Some("Web".to_string()),
                updated_at: book.created_at.clone(),
            }
        });

        let highlights = self.reader_repo.list_highlights(Some(id), None).await?;
        let bookmarks = self.reader_repo.list_bookmarks(id).await?;

        let toc: Vec<Value> = full_chapters.iter().enumerate().map(|(idx, ch)| {
            let ch_id = ch.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| format!("ch_{}", idx + 1));
            let title = ch.get("title").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_else(|| format!("第 {} 章", idx + 1));
            let word_count = ch.get("wordCount").and_then(|v| v.as_i64()).unwrap_or_else(|| {
                ch.get("content").and_then(|v| v.as_str()).map(|s| s.chars().count() as i64).unwrap_or(0)
            });
            serde_json::json!({
                "id": ch_id,
                "index": idx,
                "title": title,
                "wordCount": word_count,
            })
        }).collect();

        // Only mark response as lite when chapters were actually trimmed (> 80 chapters)
        let actual_is_lite = is_lite && full_chapters.len() > 80;
        let chapters = if actual_is_lite {
            let target_ch_idx = match target_chapter {
                Some(ch) => ch.min(full_chapters.len().saturating_sub(1)),
                None => (progress.chapter_index as usize).min(full_chapters.len().saturating_sub(1)),
            };

            let next_endnote_idx = full_chapters.iter().enumerate().position(|(idx, ch)| {
                idx > target_ch_idx && idx <= target_ch_idx + 20 && {
                    let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
                    content.contains("注释") || content.contains("注 释")
                }
            });

            let lite_list: Vec<Value> = full_chapters.iter().enumerate().map(|(idx, ch)| {
                let title = ch.get("title").and_then(|v| v.as_str()).unwrap_or("");
                let diff = idx as i64 - target_ch_idx as i64;
                // 宽裕窗口：前 15 章、后 35 章全量保留，确保听书与滑动翻页零卡顿
                let is_nearby = diff >= -15 && diff <= 35;
                let is_ref = Some(idx) == next_endnote_idx
                    || title.contains("参考文献")
                    || title.contains("注释")
                    || title.contains("尾注")
                    || title.contains("扩展阅读")
                    || title.to_lowercase().contains("references")
                    || title.to_lowercase().contains("bibliography")
                    || title.to_lowercase().contains("notes");

                if is_nearby || is_ref {
                    ch.clone()
                } else {
                    let mut partial_ch = ch.clone();
                    if let Some(obj) = partial_ch.as_object_mut() {
                        obj.insert("content".to_string(), Value::String(String::new()));
                        obj.insert("_partial".to_string(), Value::Bool(true));
                    }
                    partial_ch
                }
            }).collect();
            lite_list
        } else {
            full_chapters.as_ref().clone()
        };

        Ok(serde_json::json!({
            "book": book,
            "toc": toc,
            "chapters": chapters,
            "is_lite": actual_is_lite,
            "progress": progress,
            "highlights": highlights,
            "bookmarks": bookmarks,
        }))
    }

    async fn get_book_chapter(&self, id: &str, index: usize, bilingual: bool) -> AppResult<Value> {
        let chapters = if let Some(cached) = self.get_cached_chapters(id) {
            cached
        } else {
            let raw = self.repo.get_raw_chapters(id).await?.unwrap_or_else(|| "[]".into());
            self.get_or_parse_chapters(id, &raw)
        };
        if let Some(ch) = chapters.get(index) {
            let mut ch_obj = ch.clone();
            let bilingual_list: Vec<Value> = if !bilingual {
                Vec::new()
            } else {
                let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
                let paras: Vec<String> = content
                    .split('\n')
                    .map(|p| p.trim().to_string())
                    .filter(|p| !p.is_empty())
                    .collect();

                crate::services::ai_service::translate_chapter_paragraphs(&self.db, &paras).await
            };

            if let Some(obj) = ch_obj.as_object_mut() {
                obj.insert("bilingual".to_string(), Value::Array(bilingual_list));
            }

            Ok(serde_json::json!({
                "chapter": ch_obj
            }))
        } else {
            Err(DomainError::ValidationError(format!("章节索引 {} 不存在", index)).into())
        }
    }

    async fn get_pdf_meta(&self, id: &str) -> AppResult<Value> {
        let book = self.get_book_details(id).await?;
        let book_cache_dir = self.config.pdf_cache_dir.join(id);
        let meta_file = book_cache_dir.join("meta.json");

        let mut meta_val: Option<Value> = None;
        if meta_file.exists() {
            if let Ok(content) = tokio::fs::read_to_string(&meta_file).await {
                if let Ok(val) = serde_json::from_str::<Value>(&content) {
                    let p_count = val
                        .get("total_pages")
                        .or_else(|| val.get("totalPages"))
                        .or_else(|| val.get("page_count"))
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0);
                    if p_count > 1 {
                        meta_val = Some(val);
                    }
                }
            }
        }

        if meta_val.is_none() {
            let mut extracted_meta: Option<Value> = None;
            if !book.file_path.is_empty() {
                let file_path_owned = std::path::PathBuf::from(&book.file_path);
                if file_path_owned.exists() {
                    let page_texts = tokio::task::spawn_blocking(move || {
                        crate::infra::parser::pdf::extract_pages_with_pdftotext(&file_path_owned)
                    })
                    .await
                    .unwrap_or_default();

                    if page_texts.len() > 1 {
                        let total_p = page_texts.len();
                        let pages: Vec<Value> = page_texts
                            .into_iter()
                            .enumerate()
                            .map(|(idx, text)| {
                                serde_json::json!({
                                    "page_num": idx + 1,
                                    "chapter_index": 0,
                                    "width": 800,
                                    "height": 1120,
                                    "has_image": true,
                                    "has_text": !text.trim().is_empty(),
                                    "text": text,
                                    "text_preview": text.chars().take(180).collect::<String>(),
                                    "char_count": text.chars().count(),
                                })
                            })
                            .collect();

                        extracted_meta = Some(serde_json::json!({
                            "book_id": id,
                            "title": book.title,
                            "total_pages": total_p,
                            "totalPages": total_p,
                            "page_count": total_p,
                            "pages": pages,
                        }));
                    }
                }
            }

            if let Some(m) = extracted_meta {
                if tokio::fs::create_dir_all(&book_cache_dir).await.is_ok() {
                    if let Ok(s) = serde_json::to_string_pretty(&m) {
                        let _ = tokio::fs::write(&meta_file, s).await;
                    }
                }
                meta_val = Some(m);
            } else if let Ok(Some(raw)) = self.repo.get_raw_chapters(id).await {
                let chs = self.get_or_parse_chapters(id, &raw);
                let built = crate::infra::parser::pdf::build_pdf_meta_json(id, &chs);
                if tokio::fs::create_dir_all(&book_cache_dir).await.is_ok() {
                    if let Ok(s) = serde_json::to_string_pretty(&built) {
                        let _ = tokio::fs::write(&meta_file, s).await;
                    }
                }
                meta_val = Some(built);
            }
        }

        if let Some(val) = meta_val {
            let raw_pages = val.get("pages").and_then(|v| v.as_array()).cloned().unwrap_or_default();
            let total_pages = val
                .get("total_pages")
                .or_else(|| val.get("totalPages"))
                .or_else(|| val.get("page_count"))
                .and_then(|v| v.as_i64())
                .unwrap_or_else(|| (raw_pages.len().max(1)) as i64);

            let normalized_pages: Vec<Value> = raw_pages
                .into_iter()
                .enumerate()
                .map(|(idx, p)| {
                    let page_num = p
                        .get("page_num")
                        .or_else(|| p.get("pageNum"))
                        .and_then(|v| v.as_i64())
                        .unwrap_or((idx + 1) as i64);
                    let chapter_index = p
                        .get("chapter_index")
                        .or_else(|| p.get("chapterIndex"))
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0);
                    let width = p.get("width").and_then(|v| v.as_i64()).unwrap_or(800);
                    let height = p.get("height").and_then(|v| v.as_i64()).unwrap_or(1120);
                    let has_image = p
                        .get("has_image")
                        .or_else(|| p.get("hasImage"))
                        .and_then(|v| v.as_bool())
                        .unwrap_or(true);
                    let has_text = p
                        .get("has_text")
                        .or_else(|| p.get("hasText"))
                        .and_then(|v| v.as_bool())
                        .unwrap_or(true);
                    let full_text = p
                        .get("text")
                        .or_else(|| p.get("text_preview"))
                        .or_else(|| p.get("textPreview"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let preview: String = full_text.chars().take(180).collect();
                    serde_json::json!({
                        "page_num": page_num,
                        "chapter_index": chapter_index,
                        "width": width,
                        "height": height,
                        "has_image": has_image,
                        "has_text": has_text,
                        "text": full_text,
                        "text_preview": preview,
                        "char_count": full_text.chars().count(),
                    })
                })
                .collect();

            let image_page_count = normalized_pages
                .iter()
                .filter(|p| p.get("has_image").and_then(|v| v.as_bool()).unwrap_or(false))
                .count() as i64;

            return Ok(serde_json::json!({
                "book_id": id,
                "title": book.title,
                "page_count": total_pages,
                "total_pages": total_pages,
                "totalPages": total_pages,
                "text_page_count": total_pages,
                "image_page_count": image_page_count,
                "is_scanned_or_hybrid": image_page_count > 0,
                "pages": normalized_pages,
            }));
        }

        Ok(serde_json::json!({
            "book_id": id,
            "title": book.title,
            "page_count": 1,
            "total_pages": 1,
            "totalPages": 1,
            "text_page_count": 1,
            "image_page_count": 1,
            "is_scanned_or_hybrid": true,
            "pages": [{
                "page_num": 1,
                "chapter_index": 0,
                "width": 800,
                "height": 1120,
                "has_image": true,
                "has_text": true,
                "text_preview": "",
                "text": "",
                "char_count": 0
            }]
        }))
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
        let res = self.upload_service.complete_upload(id).await?;
        self.invalidate_cache(id);
        let book_val = res.get("book").cloned().unwrap_or(Value::Null);
        let book: Book = serde_json::from_value(book_val)
            .map_err(|e| DomainError::ValidationError(format!("更新书籍记录失败: {}", e)))?;
        Ok(book)
    }

    async fn reparse_all_books(&self) -> AppResult<Value> {
        let books = self.repo.list(&BookFilter::default()).await?;
        let mut count = 0;
        let mut reloaded = Vec::new();
        for b in books {
            if !b.file_path.is_empty() && std::path::Path::new(&b.file_path).exists() {
                if let Ok(updated) = self.reparse_book(&b.id).await {
                    count += 1;
                    reloaded.push(updated.title);
                }
            }
        }
        Ok(serde_json::json!({
            "ok": true,
            "reparsed_count": count,
            "reparsed_titles": reloaded
        }))
    }
}
