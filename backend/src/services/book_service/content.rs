use serde_json::Value;
use std::sync::Arc;

use crate::domain::entities::book::Book;
use crate::domain::traits::ReaderRepository;
use crate::error::{AppResult, DomainError};

pub async fn build_book_content(
    id: &str,
    book: &Book,
    full_chapters: &[Value],
    reader_repo: &dyn ReaderRepository,
    is_lite: bool,
    target_chapter: Option<usize>,
) -> AppResult<Value> {
    let progress = reader_repo.get_progress(id).await?.unwrap_or_else(|| {
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

    let highlights = reader_repo.list_highlights(Some(id), None).await?;
    let bookmarks = reader_repo.list_bookmarks(id).await?;

    let toc: Vec<Value> = full_chapters
        .iter()
        .enumerate()
        .map(|(idx, ch)| {
            let ch_id = ch
                .get("id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("ch_{}", idx + 1));
            let title = ch
                .get("title")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("第 {} 章", idx + 1));
            let word_count = ch
                .get("wordCount")
                .and_then(|v| v.as_i64())
                .unwrap_or_else(|| {
                    ch.get("content")
                        .and_then(|v| v.as_str())
                        .map(|s| s.chars().count() as i64)
                        .unwrap_or(0)
                });
            serde_json::json!({
                "id": ch_id,
                "index": idx,
                "title": title,
                "wordCount": word_count,
            })
        })
        .collect();

    let actual_is_lite = is_lite && full_chapters.len() > 80;
    let chapters = if actual_is_lite {
        let target_ch_idx = match target_chapter {
            Some(ch) => ch.min(full_chapters.len().saturating_sub(1)),
            None => (progress.chapter_index as usize).min(full_chapters.len().saturating_sub(1)),
        };

        let next_endnote_idx = full_chapters.iter().enumerate().position(|(idx, ch)| {
            idx > target_ch_idx
                && idx <= target_ch_idx + 20
                && {
                    let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
                    content.contains("注释") || content.contains("注 释")
                }
        });

        let lite_list: Vec<Value> = full_chapters
            .iter()
            .enumerate()
            .map(|(idx, ch)| {
                let title = ch.get("title").and_then(|v| v.as_str()).unwrap_or("");
                let diff = idx as i64 - target_ch_idx as i64;
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
            })
            .collect();
        lite_list
    } else {
        full_chapters.to_vec()
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

pub async fn build_book_chapter(
    db: &crate::infra::db::DbContext,
    chapters: &[Value],
    index: usize,
    bilingual: bool,
) -> AppResult<Value> {
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

            crate::services::ai_service::translate_chapter_paragraphs(db, &paras).await
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
