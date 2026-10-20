use serde_json::Value;
use std::path::Path;
use std::sync::Arc;

use crate::domain::entities::book::Book;
use crate::domain::traits::{BookFilter, BookRepository};
use crate::error::{AppResult, DomainError, InfraError};
use crate::infra::db::DbContext;

pub async fn clear_system_cache(
    db: &DbContext,
    pdf_cache_dir: &Path,
    tts_cache_dir: &Path,
    data_dir: &Path,
    repo: &dyn BookRepository,
) -> AppResult<Value> {
    let pdf_cache = pdf_cache_dir.to_path_buf();
    let tts_cache = tts_cache_dir.to_path_buf();
    let trash_cache = data_dir.join(".trash_pdf_cache");

    tokio::task::spawn_blocking(move || {
        let _ = std::fs::remove_dir_all(&pdf_cache);
        let _ = std::fs::remove_dir_all(&tts_cache);
        let _ = std::fs::remove_dir_all(&trash_cache);
        let _ = std::fs::create_dir_all(&pdf_cache);
        let _ = std::fs::create_dir_all(&tts_cache);
    })
    .await
    .map_err(InfraError::JoinError)?;

    let _ = db
        .interact(|conn| {
            let _ = conn.execute("DELETE FROM tts_audio_cache", []);
            Ok(())
        })
        .await;

    let _ = repo.list(&BookFilter::default()).await;

    Ok(serde_json::json!({
        "ok": true,
        "cleared": ["pdf_cache", "tts_cache"],
        "cleared_at": chrono::Local::now().to_rfc3339(),
    }))
}

pub async fn execute_reparse_book(
    id: &str,
    book: &Book,
    covers_dir: &Path,
    pdf_cache_dir: &Path,
    repo: &dyn BookRepository,
) -> AppResult<Book> {
    let file_path = Path::new(&book.file_path);
    if !file_path.exists() {
        return Err(DomainError::BookNotFound(format!("书籍文件不存在: {}", book.file_path)).into());
    }

    let fp_clone = file_path.to_path_buf();
    let t_owned = book.title.clone();
    let a_owned = book.author.clone();
    let c_dir_owned = covers_dir.to_path_buf();
    let parsed = tokio::task::spawn_blocking(move || {
        crate::infra::parser::parse_book_file_with_meta(&fp_clone, &t_owned, &a_owned, &c_dir_owned)
    })
    .await
    .map_err(InfraError::JoinError)?
    .map_err(DomainError::ValidationError)?;

    let chapters_json = serde_json::to_string(&parsed.chapters).unwrap_or_else(|_| "[]".into());
    let mut updated_book = book.clone();
    updated_book.word_count = parsed.word_count as i64;
    updated_book.chapters_count = parsed.chapters.len();
    if let Some(c) = parsed.cover_url {
        updated_book.cover_url = c;
    }

    repo.save(&updated_book, &chapters_json).await?;
    let _ = std::fs::remove_file(pdf_cache_dir.join(id).join("meta.json"));

    Ok(updated_book)
}

pub async fn execute_reparse_all_books(
    repo: &dyn BookRepository,
    covers_dir: &Path,
    pdf_cache_dir: &Path,
) -> AppResult<Value> {
    let books = repo.list(&BookFilter::default()).await?;
    let mut count = 0;
    let mut reloaded = Vec::new();
    for b in books {
        if !b.file_path.is_empty() && Path::new(&b.file_path).exists() {
            if let Ok(updated) = execute_reparse_book(&b.id, &b, covers_dir, pdf_cache_dir, repo).await {
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
