use serde_json::Value;
use std::path::{Path, PathBuf};

use crate::domain::entities::book::Book;
use crate::error::{AppResult, DomainError, InfraError};

fn normalize_pages_array(raw_pages: Vec<Value>) -> Vec<Value> {
    raw_pages
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
        .collect()
}

pub async fn resolve_pdf_meta(
    book: &Book,
    pdf_cache_dir: &Path,
    parsed_chapters: &[Value],
) -> AppResult<Value> {
    let id = &book.id;
    let book_cache_dir = pdf_cache_dir.join(id);
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
            let file_path_owned = PathBuf::from(&book.file_path);
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
        } else {
            let built = crate::infra::parser::pdf::build_pdf_meta_json(id, parsed_chapters);
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

        let normalized_pages = normalize_pages_array(raw_pages);
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

pub fn render_page_image(
    file_path: &str,
    page: usize,
    pdf_cache_dir: &Path,
    book_id: &str,
) -> Option<PathBuf> {
    let fp = PathBuf::from(file_path);
    if !fp.exists() {
        return None;
    }
    let book_dir = pdf_cache_dir.join(book_id);
    crate::infra::parser::pdf::render_pdf_page_to_jpeg(&fp, page, &book_dir)
}
