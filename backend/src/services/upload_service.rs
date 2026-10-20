use chrono::Local;
use serde_json::Value;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncSeekExt, AsyncWriteExt};
use crate::config::AppConfig;
use crate::domain::entities::book::{Book, BookFormat, BookStatus};
use crate::domain::traits::BookRepository;
use crate::error::{AppResult, DomainError, InfraError};
use crate::infra::parser::{infer_title_and_author, parse_book_file, parse_book_file_with_meta};

static UPLOAD_SEQ: AtomicU64 = AtomicU64::new(1);

fn make_safe_book_id(seed: &str) -> String {
    let prefix: String = seed
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(4)
        .collect::<String>()
        .to_lowercase();
    let safe_prefix = if prefix.is_empty() { "bk".to_string() } else { prefix };
    let seq = UPLOAD_SEQ.fetch_add(1, Ordering::Relaxed) % 10000;
    format!("book_local_{}_{}_{:04}", Local::now().timestamp_millis(), safe_prefix, seq)
}

pub struct UploadService {
    repo: Arc<dyn BookRepository>,
    config: AppConfig,
}

impl UploadService {
    pub fn new(repo: Arc<dyn BookRepository>, config: AppConfig) -> Self {
        Self { repo, config }
    }

    pub async fn upload_book_raw(
        &self,
        filename: String,
        raw_bytes: Vec<u8>,
        author: Option<String>,
        category: Option<String>,
        lib_id: Option<String>,
    ) -> AppResult<Value> {
        let ext = PathBuf::from(&filename)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("txt")
            .to_lowercase();
        let book_format = BookFormat::from_ext(&ext)?;

        let book_id = make_safe_book_id(&filename);
        let saved_path = self.config.books_dir.join(format!("{}.{}", book_id, ext));

        tokio::fs::write(&saved_path, &raw_bytes).await.map_err(InfraError::Io)?;

        let saved_path_clone = saved_path.clone();
        let filename_clone = filename.clone();
        let covers_dir = self.config.covers_dir.clone();
        let parsed = tokio::task::spawn_blocking(move || {
            parse_book_file(&saved_path_clone, &filename_clone, &covers_dir)
        })
        .await
        .map_err(InfraError::JoinError)?
        .map_err(|e| DomainError::ValidationError(format!("解析书籍失败: {}", e)))?;

        let now = Local::now().to_rfc3339();
        let final_author = author.filter(|a| !a.trim().is_empty()).unwrap_or(parsed.author);
        let final_category = category.unwrap_or_else(|| "本地导入".into());
        let final_library_id = lib_id.unwrap_or_else(|| "lib-default".into());
        let chapters_json = serde_json::to_string(&parsed.chapters).unwrap_or_else(|_| "[]".into());

        let book = Book {
            id: book_id.clone(),
            title: parsed.title,
            author: final_author,
            cover_url: parsed.cover_url.unwrap_or_default(),
            cover_color: "#1e40af".into(),
            isbn: parsed.isbn.unwrap_or_default(),
            publisher: parsed.publisher.unwrap_or_else(|| "本地私有书库".into()),
            publish_year: Local::now().format("%Y").to_string(),
            source_type: "local".into(),
            format: book_format,
            file_path: saved_path.to_str().unwrap_or_default().to_string(),
            file_size: raw_bytes.len() as i64,
            word_count: parsed.word_count as i64,
            category: final_category,
            library_id: final_library_id,
            tags: vec!["本地导入".into(), ext.to_uppercase()],
            status: BookStatus::Unread,
            import_progress: 100,
            import_step: "导入完成".into(),
            import_error: "".into(),
            total_reading_seconds: 0,
            last_read_at: "".into(),
            description: parsed.description.unwrap_or_default(),
            chapters_count: parsed.chapters.len(),
            created_at: now,
            progress: None,
        };

        self.repo.save(&book, &chapters_json).await?;
        if book.format.as_str() == "pdf" {
            self.write_pdf_meta_cache(&book_id, &book.title, &parsed.chapters);
        }

        let repo_bg = Arc::clone(&self.repo);
        let bid_bg = book_id.clone();
        let title_bg = book.title.clone();
        let author_bg = book.author.clone();
        let color_bg = book.cover_color.clone();
        let chapters_bg = parsed.chapters;
        tokio::spawn(async move {
            let paras = tokio::task::spawn_blocking(move || extract_paragraphs_for_index(&chapters_bg))
                .await
                .unwrap_or_default();
            if !paras.is_empty() {
                let _ = repo_bg
                    .batch_index_paragraphs(&bid_bg, &title_bg, &author_bg, &color_bg, &paras)
                    .await;
            }
        });

        Ok(serde_json::json!({ "ok": true, "book": book }))
    }

    pub async fn init_chunk_upload(
        &self,
        filename: String,
        file_size: i64,
        author: Option<String>,
        category: Option<String>,
        lib_id: Option<String>,
    ) -> AppResult<Value> {
        let ext = PathBuf::from(&filename)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("txt")
            .to_lowercase();
        let book_format = BookFormat::from_ext(&ext)?;

        let (inferred_title, inferred_author) = infer_title_and_author(&filename);
        let title = if inferred_title.is_empty() { filename.clone() } else { inferred_title };
        let final_author = author.filter(|a| !a.trim().is_empty()).unwrap_or(inferred_author);

        let safe_book_id = make_safe_book_id(&title);

        let saved_path = self.config.books_dir.join(format!("{}.{}", safe_book_id, ext));
        tokio::fs::write(&saved_path, b"").await.map_err(InfraError::Io)?;

        let now = Local::now().to_rfc3339();
        let book = Book {
            id: safe_book_id.clone(),
            title: title.clone(),
            author: final_author.clone(),
            cover_url: "".into(),
            cover_color: "#1e40af".into(),
            isbn: "".into(),
            publisher: "本地私有书库".into(),
            publish_year: Local::now().format("%Y").to_string(),
            source_type: "local".into(),
            format: book_format,
            file_path: saved_path.to_str().unwrap_or_default().to_string(),
            file_size,
            word_count: 0,
            category: category.unwrap_or_else(|| "本地导入".into()),
            library_id: lib_id.unwrap_or_else(|| "lib-default".into()),
            tags: vec!["本地导入".into(), ext.to_uppercase()],
            status: BookStatus::Importing,
            import_progress: 3,
            import_step: "正在上传文件 (0%)...".into(),
            import_error: "".into(),
            total_reading_seconds: 0,
            last_read_at: "".into(),
            description: "正在导入与解析书籍内容...".into(),
            chapters_count: 0,
            created_at: now.clone(),
            progress: None,
        };

        self.repo.save(&book, "[]").await?;
        Ok(serde_json::json!({ "ok": true, "bookId": safe_book_id, "book": book }))
    }

    pub async fn append_chunk(
        &self,
        book_id: &str,
        chunk_index: i64,
        total_chunks: i64,
        chunk: Vec<u8>,
    ) -> AppResult<Value> {
        let book = self.repo.find_by_id(book_id).await?.ok_or_else(|| DomainError::BookNotFound(book_id.to_string()))?;
        let path = PathBuf::from(&book.file_path);

        let mut file = tokio::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .open(&path)
            .await
            .map_err(InfraError::Io)?;

        let current_len = file.metadata().await.map(|m| m.len()).unwrap_or(0);
        let chunk_len = chunk.len() as u64;
        let offset = if chunk_index <= 0 {
            if current_len > 0 {
                let _ = file.set_len(0).await;
            }
            0
        } else if chunk_index + 1 < total_chunks && chunk_len > 0 {
            let exact_offset = (chunk_index as u64) * chunk_len;
            if current_len >= exact_offset {
                exact_offset
            } else {
                current_len
            }
        } else if book.file_size > 0 && (book.file_size as u64) >= chunk_len {
            let tail_offset = (book.file_size as u64) - chunk_len;
            if current_len >= tail_offset {
                tail_offset
            } else {
                current_len
            }
        } else {
            current_len
        };

        file.seek(std::io::SeekFrom::Start(offset)).await.map_err(InfraError::Io)?;
        file.write_all(&chunk).await.map_err(InfraError::Io)?;

        let progress = (((chunk_index + 1) as f64 / total_chunks.max(1) as f64) * 80.0).round() as i64;
        let step = format!("正在上传文件 ({}%)...", progress);
        if progress % 10 == 0 || chunk_index + 1 >= total_chunks {
            let _ = self.repo.update_import_status(book_id, progress, &step, "importing", "").await;
        }

        Ok(serde_json::json!({
            "ok": true,
            "chunk_index": chunk_index,
            "received_bytes": chunk.len(),
            "progress": progress,
            "step": step
        }))
    }

    pub async fn complete_upload(&self, book_id: &str) -> AppResult<Value> {
        let mut book = self.repo.find_by_id(book_id).await?.ok_or_else(|| DomainError::BookNotFound(book_id.to_string()))?;
        let path = PathBuf::from(&book.file_path);

        book.import_progress = 85;
        book.import_step = "正在提取章节与封面...".into();
        let _ = self.repo.update_import_status(book_id, 85, &book.import_step, "importing", "").await;

        let repo_clone = Arc::clone(&self.repo);
        let config_clone = self.config.clone();
        let book_clone = book.clone();
        let bid_owned = book_id.to_string();

        let (tx, rx) = tokio::sync::oneshot::channel::<AppResult<Book>>();

        tokio::spawn(async move {
            let path_clone = path.clone();
            let covers_dir = config_clone.covers_dir.clone();
            let original_title = book_clone.title.clone();
            let original_author = book_clone.author.clone();

            let parsed_res = tokio::task::spawn_blocking(move || {
                parse_book_file_with_meta(&path_clone, &original_title, &original_author, &covers_dir)
            })
            .await;

            let parsed = match parsed_res {
                Ok(Ok(p)) => p,
                Ok(Err(e)) => {
                    let err_msg = format!("解析失败: {}", e);
                    let _ = repo_clone.update_import_status(&bid_owned, 0, "解析失败", "failed", &err_msg).await;
                    let _ = tx.send(Err(DomainError::ValidationError(err_msg).into()));
                    return;
                }
                Err(join_err) => {
                    let err_msg = format!("解析任务异常: {}", join_err);
                    let _ = repo_clone.update_import_status(&bid_owned, 0, "解析失败", "failed", &err_msg).await;
                    let _ = tx.send(Err(InfraError::JoinError(join_err).into()));
                    return;
                }
            };

            if repo_clone.find_by_id(&bid_owned).await.ok().flatten().is_none() {
                let _ = tx.send(Err(DomainError::BookNotFound(bid_owned).into()));
                return;
            }

            let meta_len = tokio::fs::metadata(&path).await.map(|m| m.len() as i64).unwrap_or(book_clone.file_size);
            let mut updated = book_clone;
            if !parsed.title.is_empty() { updated.title = parsed.title; }
            if !parsed.author.is_empty() && parsed.author != "未知作者" { updated.author = parsed.author; }
            if let Some(cover) = parsed.cover_url {
                if !cover.is_empty() { updated.cover_url = cover; }
            }
            if let Some(desc) = parsed.description {
                if !desc.is_empty() { updated.description = desc; }
            }
            if let Some(isbn) = parsed.isbn {
                if !isbn.is_empty() { updated.isbn = isbn; }
            }
            if let Some(publisher) = parsed.publisher {
                if !publisher.is_empty() { updated.publisher = publisher; }
            }
            updated.file_size = meta_len;
            updated.word_count = parsed.word_count as i64;
            updated.status = BookStatus::Unread;
            updated.import_progress = 100;
            updated.import_step = "导入完成".into();
            updated.import_error = "".into();
            updated.chapters_count = parsed.chapters.len();

            let ch_json = serde_json::to_string(&parsed.chapters).unwrap_or_else(|_| "[]".into());
            if let Err(e) = repo_clone.save(&updated, &ch_json).await {
                let _ = tx.send(Err(e));
                return;
            }

            if updated.format.as_str() == "pdf" {
                let dir = config_clone.pdf_cache_dir.join(&bid_owned);
                if std::fs::create_dir_all(&dir).is_ok() {
                    let mut meta = crate::infra::parser::pdf::build_pdf_meta_json(&bid_owned, &parsed.chapters);
                    if let Some(obj) = meta.as_object_mut() {
                        obj.insert("title".to_string(), Value::String(updated.title.clone()));
                        if let Some(cnt) = obj.get("page_count").cloned() {
                            obj.insert("total_pages".to_string(), cnt.clone());
                            obj.insert("totalPages".to_string(), cnt);
                        }
                    }
                    if let Ok(json_str) = serde_json::to_string_pretty(&meta) {
                        let _ = std::fs::write(dir.join("meta.json"), json_str);
                    }
                }
            }

            let updated_ret = updated.clone();
            let _ = tx.send(Ok(updated_ret));

            // Build FTS5 full-text search index asynchronously in background
            let chapters_for_idx = parsed.chapters;
            let paras = tokio::task::spawn_blocking(move || extract_paragraphs_for_index(&chapters_for_idx))
                .await
                .unwrap_or_default();
            if !paras.is_empty() {
                let _ = repo_clone
                    .batch_index_paragraphs(&bid_owned, &updated.title, &updated.author, &updated.cover_color, &paras)
                    .await;
            }
        });

        match tokio::time::timeout(std::time::Duration::from_millis(4000), rx).await {
            Ok(Ok(Ok(completed_book))) => Ok(serde_json::json!({ "ok": true, "book": completed_book })),
            Ok(Ok(Err(e))) => Err(e),
            Ok(Err(_)) | Err(_) => {
                // Background task is still parsing a very large file; return current importing state
                // so the mobile HTTP request completes cleanly and bookshelf polling tracks completion.
                Ok(serde_json::json!({ "ok": true, "book": book }))
            }
        }
    }

    pub async fn fail_upload(&self, book_id: &str, error: &str) -> AppResult<()> {
        if let Ok(Some(book)) = self.repo.find_by_id(book_id).await {
            // Do not abort or delete if all chunks were already received and background parsing is active or finished
            if book.status != BookStatus::Importing || book.import_progress >= 85 {
                return Ok(());
            }
            if !book.file_path.is_empty() {
                let _ = tokio::fs::remove_file(&book.file_path).await;
            }
        }
        self.repo.update_import_status(book_id, 0, "导入失败", "failed", error).await
    }

    fn write_pdf_meta_cache(&self, book_id: &str, title: &str, chapters: &[Value]) {
        let dir = self.config.pdf_cache_dir.join(book_id);
        if std::fs::create_dir_all(&dir).is_ok() {
            let mut meta = crate::infra::parser::pdf::build_pdf_meta_json(book_id, chapters);
            if let Some(obj) = meta.as_object_mut() {
                obj.insert("title".to_string(), Value::String(title.to_string()));
                if let Some(cnt) = obj.get("page_count").cloned() {
                    obj.insert("total_pages".to_string(), cnt.clone());
                    obj.insert("totalPages".to_string(), cnt);
                }
            }
            if let Ok(json_str) = serde_json::to_string_pretty(&meta) {
                let _ = std::fs::write(dir.join("meta.json"), json_str);
            }
        }
    }
}

fn extract_paragraphs_for_index(chapters: &[Value]) -> Vec<(usize, usize, i64, String, String)> {
    let mut paras = Vec::new();
    for (ch_idx, ch) in chapters.iter().enumerate() {
        let ch_title = ch.get("title")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("第 {} 章", ch_idx + 1));
        let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
        let mut running_offset: i64 = 0;
        let mut p_idx: usize = 0;
        for line in content.split('\n') {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                if !(trimmed.starts_with("[[PDF_PAGE:") && trimmed.ends_with("]]")) {
                    paras.push((ch_idx, p_idx, running_offset, trimmed.to_string(), ch_title.clone()));
                }
                running_offset += trimmed.chars().count() as i64 + 2;
                p_idx += 1;
            }
        }
    }
    paras
}
