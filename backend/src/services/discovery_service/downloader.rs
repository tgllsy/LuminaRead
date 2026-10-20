use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use serde_json::Value;

use crate::domain::entities::book::{Book, BookFormat, BookStatus};
use crate::domain::entities::source::DownloadTask;
use crate::domain::traits::{BookRepository, SourceRepository};
use crate::error::{AppResult, DomainError, InfraError};
use crate::infra::parser::parse_book_file_with_meta;

use super::builder::generate_valid_epub_bytes;
use super::http_client::http_fetch_bytes;
use super::network::resolve_effective_proxy;
use super::providers::internet_archive::resolve_internet_archive_download_url;
use super::providers::opds_and_wikisource::fetch_wikisource_full_book;
use super::providers::shadow_library::resolve_libgen_download_url;
use super::sanitizer::{format_bytes, strip_promotional_parentheticals};

static DL_SEQ: AtomicU64 = AtomicU64::new(1);

pub async fn resolve_download_target(
    task_dto: &Value,
    remote_id: &str,
    clean_title: &str,
    format: &str,
    proxy: &str,
) -> (String, String, String) {
    let mut download_url = task_dto
        .get("download_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    if download_url.contains("z-library.sk/")
        || download_url.contains("annas-archive.org/")
        || download_url.contains("openlibrary.org/")
        || download_url.contains("standardebooks.org/")
    {
        download_url.clear();
    }

    let effective_md5 = task_dto.get("libgen_md5").and_then(|v| v.as_str()).map(|s| s.to_string())
        .or_else(|| if remote_id.starts_with("md5:") { Some(remote_id[4..].to_string()) } else { None })
        .unwrap_or_default();

    let effective_ia_id = task_dto.get("ia_identifier").and_then(|v| v.as_str()).map(|s| s.to_string())
        .or_else(|| if remote_id.starts_with("ia:") { Some(remote_id[3..].to_string()) } else { None })
        .unwrap_or_default();

    let mut effective_fmt = format.to_string();

    if download_url.is_empty() && !effective_md5.is_empty() {
        if let Some(lg) = resolve_libgen_download_url(&effective_md5, proxy).await {
            download_url = lg;
        }
    }

    if download_url.is_empty() && !effective_ia_id.is_empty() {
        if let Some((url, fmt)) = resolve_internet_archive_download_url(&effective_ia_id, &effective_fmt, clean_title, proxy).await {
            download_url = url;
            effective_fmt = fmt;
        }
    }

    if download_url.is_empty() && (remote_id.starts_with("gutenberg:") || remote_id.starts_with("gutendex:")) {
        if let Some(pg_id) = remote_id.split(':').nth(1) {
            download_url = if effective_fmt == "txt" {
                format!("https://www.gutenberg.org/ebooks/{}.txt.utf-8", pg_id)
            } else {
                format!("https://www.gutenberg.org/ebooks/{}.epub.noimages", pg_id)
            };
        }
    }

    (download_url, effective_ia_id, effective_fmt)
}

pub async fn fetch_download_content(
    clean_title: &str,
    remote_id: &str,
    download_url: &str,
    effective_ia_id: &str,
    format: &str,
    proxy: &str,
) -> (Option<Vec<u8>>, Option<Vec<Value>>, String) {
    let mut actual_fmt = format.to_string();

    if remote_id.starts_with("wikisource:") {
        let ws_title = remote_id.split(':').nth(2).unwrap_or(clean_title);
        if let Some(chs) = fetch_wikisource_full_book(ws_title, proxy).await {
            return (None, Some(chs), actual_fmt);
        }
    }

    if !download_url.is_empty() {
        if let Some(buf) = http_fetch_bytes(download_url, proxy, 45).await {
            let head = String::from_utf8_lossy(&buf[..buf.len().min(350)]).to_lowercase();
            if buf.len() > 1024 && !head.contains("<!doctype html") && !head.contains("<html") && !head.contains("welcome to nginx") {
                if buf.starts_with(b"%PDF") { actual_fmt = "pdf".into(); }
                else if buf.starts_with(b"PK") { actual_fmt = "epub".into(); }
                else if buf.len() >= 68 && (&buf[60..68] == b"BOOKMOBI" || &buf[60..68] == b"TEXtREAd") { actual_fmt = "mobi".into(); }
                return (Some(buf), None, actual_fmt);
            }
        }
    }

    if !effective_ia_id.is_empty() {
        if let Some((alt_url, alt_fmt)) = resolve_internet_archive_download_url(effective_ia_id, "txt", clean_title, proxy).await {
            if let Some(buf) = http_fetch_bytes(&alt_url, proxy, 30).await {
                if buf.len() > 512 {
                    return (Some(buf), None, alt_fmt);
                }
            }
        }
    }

    let cleaned_t = clean_title.replace(['《', '》'], "");
    let base_t = cleaned_t.split(['（', '(', '·', ':', '：']).next().unwrap_or(clean_title);
    if let Some(chs) = fetch_wikisource_full_book(base_t, proxy).await {
        return (None, Some(chs), actual_fmt);
    }

    (None, None, actual_fmt)
}

pub async fn persist_and_index_book(
    books_dir: &Path,
    covers_dir: &Path,
    book_id: &str,
    clean_title: &str,
    author: &str,
    publisher: &str,
    description: &str,
    format: &str,
    downloaded: Option<Vec<u8>>,
    ws_chs: Option<Vec<Value>>,
) -> AppResult<(Vec<Value>, i64, i64, Option<String>)> {
    let file_path = books_dir.join(format!("{}.{}", book_id, format));

    if let Some(chs) = ws_chs {
        let total_wc: usize = chs.iter().map(|c| c.get("wordCount").and_then(|v| v.as_u64()).unwrap_or(0) as usize).sum();
        let bytes = if format == "txt" {
            let txt = chs.iter().map(|c| format!("{}\n\n{}", c.get("title").and_then(|v| v.as_str()).unwrap_or(""), c.get("content").and_then(|v| v.as_str()).unwrap_or(""))).collect::<Vec<_>>().join("\n\n\n");
            txt.into_bytes()
        } else {
            generate_valid_epub_bytes(clean_title, author, publisher, description, &chs).unwrap_or_default()
        };
        let fsize = bytes.len() as i64;
        tokio::fs::write(&file_path, &bytes).await.map_err(InfraError::Io)?;
        return Ok((chs, total_wc as i64, fsize, None));
    }

    if let Some(raw_buf) = downloaded {
        let fsize = raw_buf.len() as i64;
        tokio::fs::write(&file_path, &raw_buf).await.map_err(InfraError::Io)?;
        let fp_clone = file_path.clone();
        let t_owned = clean_title.to_string();
        let a_owned = author.to_string();
        let c_dir_owned = covers_dir.to_path_buf();
        let parsed = tokio::task::spawn_blocking(move || {
            parse_book_file_with_meta(&fp_clone, &t_owned, &a_owned, &c_dir_owned)
        }).await.map_err(InfraError::JoinError)?.map_err(DomainError::ValidationError)?;
        return Ok((parsed.chapters, parsed.word_count as i64, fsize, parsed.cover_url));
    }

    Err(DomainError::ValidationError(format!("书源暂时无法获取《{}》的全文文件", clean_title)).into())
}

#[allow(clippy::too_many_arguments)]
fn construct_book_record(
    book_id: &str,
    clean_title: &str,
    author: &str,
    publisher: &str,
    publish_year: &str,
    description: &str,
    isbn: &str,
    cover_url: &str,
    cover_color: &str,
    category: &str,
    source_type: &str,
    tags: Vec<String>,
    format: &str,
    file_path: &Path,
    file_size: i64,
    word_count: i64,
    chapters_count: usize,
    created_at: &str,
) -> Book {
    Book {
        id: book_id.to_string(),
        title: clean_title.to_string(),
        author: author.to_string(),
        cover_url: cover_url.to_string(),
        cover_color: cover_color.to_string(),
        isbn: isbn.to_string(),
        publisher: publisher.to_string(),
        publish_year: publish_year.to_string(),
        source_type: source_type.to_string(),
        format: BookFormat::from_ext(format).unwrap_or(BookFormat::Epub),
        file_path: file_path.to_string_lossy().to_string(),
        file_size: file_size.max(4096),
        word_count,
        category: category.to_string(),
        library_id: "lib-default".to_string(),
        tags,
        status: BookStatus::Unread,
        import_progress: 100,
        import_step: "下载完成".to_string(),
        import_error: String::new(),
        total_reading_seconds: 0,
        last_read_at: String::new(),
        description: description.to_string(),
        chapters_count,
        created_at: created_at.to_string(),
        progress: None,
    }
}

pub async fn execute_discover_download(
    task_dto: Value,
    books_dir: &Path,
    covers_dir: &Path,
    source_repo: &dyn SourceRepository,
    book_repo: &dyn BookRepository,
) -> AppResult<Value> {
    let now = chrono::Local::now();
    let now_iso = now.to_rfc3339();
    let seq = DL_SEQ.fetch_add(1, Ordering::Relaxed) % 10000;
    let task_id = format!("dl_{}_{:04}", now.timestamp_millis(), seq);
    let book_id = format!("book_dl_{}_{:04}", now.timestamp_millis(), seq);

    let remote_id = task_dto.get("remote_id").and_then(|v| v.as_str()).unwrap_or("").trim();
    let raw_title = task_dto.get("title").and_then(|v| v.as_str()).unwrap_or("精选图书");
    let clean_title = strip_promotional_parentheticals(raw_title);
    let author = task_dto.get("author").and_then(|v| v.as_str()).unwrap_or("馆藏作者");
    let requested_fmt = task_dto.get("format").and_then(|v| v.as_str()).unwrap_or("epub").to_lowercase();
    let effective_fmt = if matches!(requested_fmt.as_str(), "epub" | "txt" | "md" | "pdf" | "mobi") { requested_fmt } else { "epub".to_string() };
    let description = task_dto.get("description").and_then(|v| v.as_str()).unwrap_or("");
    let publisher = task_dto.get("publisher").and_then(|v| v.as_str()).unwrap_or("全球数字图书馆");
    let publish_year = task_dto.get("year").and_then(|v| v.as_str()).unwrap_or("2024");
    let isbn = task_dto.get("isbn").and_then(|v| v.as_str()).unwrap_or("");
    let cover_url = task_dto.get("cover_url").and_then(|v| v.as_str()).unwrap_or("");
    let cover_color = task_dto.get("cover_color").and_then(|v| v.as_str()).unwrap_or("#1e40af");
    let source_id = task_dto.get("source_id").and_then(|v| v.as_str()).unwrap_or("zlib-official");
    let source_type = task_dto.get("source_type").and_then(|v| v.as_str()).unwrap_or("zlibrary");
    let category = task_dto.get("category").and_then(|v| v.as_str()).unwrap_or("外部书源下载");
    let tags: Vec<String> = task_dto.get("tags").and_then(|v| v.as_array()).map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect()).unwrap_or_else(|| vec!["全网下载".to_string(), effective_fmt.to_uppercase()]);

    let proxy = resolve_effective_proxy(source_repo, None, Some(source_id)).await;
    let (dl_url, ia_id, target_fmt) = resolve_download_target(&task_dto, remote_id, &clean_title, &effective_fmt, &proxy).await;
    let (downloaded, ws_chs, final_fmt) = fetch_download_content(&clean_title, remote_id, &dl_url, &ia_id, &target_fmt, &proxy).await;

    let (final_chapters, final_wc, final_size, parsed_cover) = persist_and_index_book(
        books_dir, covers_dir, &book_id, &clean_title, author, publisher, description, &final_fmt, downloaded, ws_chs
    ).await?;

    let file_path = books_dir.join(format!("{}.{}", book_id, final_fmt));
    let final_cover = parsed_cover.unwrap_or_else(|| cover_url.to_string());
    let chapters_json = serde_json::to_string(&final_chapters).unwrap_or_else(|_| "[]".into());

    let book = construct_book_record(
        &book_id, &clean_title, author, publisher, publish_year, description, isbn, &final_cover,
        cover_color, category, source_type, tags, &final_fmt, &file_path, final_size, final_wc,
        final_chapters.len(), &now_iso
    );
    book_repo.save(&book, &chapters_json).await?;

    let task = DownloadTask {
        id: task_id.clone(),
        source_id: source_id.to_string(),
        source_type: source_type.to_string(),
        remote_id: if remote_id.is_empty() { None } else { Some(remote_id.to_string()) },
        title: clean_title.clone(),
        author: Some(author.to_string()),
        format: Some(final_fmt.clone()),
        file_size: Some(format_bytes(final_size as u64)),
        cover_url: if final_cover.is_empty() { None } else { Some(final_cover) },
        cover_color: Some(cover_color.to_string()),
        download_url: if dl_url.is_empty() { None } else { Some(dl_url) },
        status: "completed".to_string(),
        progress: 100,
        error_message: None,
        book_id: Some(book_id.clone()),
        created_at: now_iso.clone(),
        updated_at: now_iso,
    };
    let _ = source_repo.create_task(&task).await;

    Ok(serde_json::json!({
        "ok": true, "task_id": task_id, "book": book,
    }))
}
