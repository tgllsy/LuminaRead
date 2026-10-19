use async_trait::async_trait;
use rusqlite::{params, OptionalExtension};
use std::collections::HashMap;
use crate::domain::entities::book::{Book, BookFormat, BookStatus};
use crate::domain::traits::{BookFilter, BookRepository};
use crate::error::AppResult;
use crate::infra::db::pool::DbContext;

pub struct SqliteBookRepository {
    db: DbContext,
}

impl SqliteBookRepository {
    pub fn new(db: DbContext) -> Self {
        Self { db }
    }
}

fn map_book_row(r: &rusqlite::Row) -> rusqlite::Result<Book> {
    let id: String = r.get(0)?;
    let fmt_str: String = r.get(9)?;
    let status_str: String = r.get(16)?;
    let tags_str: String = r.get::<_, Option<String>>(15)?.unwrap_or_else(|| "[]".into());
    let tags = serde_json::from_str(&tags_str).unwrap_or_default();
    let created_at: String = r.get(23)?;
    let chapters_count = r.get::<_, Option<i64>>(24)?.unwrap_or(0).max(0) as usize;

    let rp_ch: Option<i64> = r.get(25).ok().flatten();
    let progress = rp_ch.map(|chapter_index| crate::domain::entities::reader::ReadingProgress {
        book_id: id.clone(),
        chapter_index,
        scroll_offset: r.get::<_, Option<f64>>(26).ok().flatten().unwrap_or(0.0),
        cfi: r.get::<_, Option<String>>(27).ok().flatten(),
        percentage: r.get::<_, Option<f64>>(28).ok().flatten().unwrap_or(0.0),
        device_name: r.get::<_, Option<String>>(29).ok().flatten(),
        updated_at: r.get::<_, Option<String>>(30).ok().flatten().unwrap_or_else(|| created_at.clone()),
    });

    Ok(Book {
        id,
        title: r.get(1)?,
        author: r.get(2)?,
        cover_url: r.get::<_, Option<String>>(3)?.unwrap_or_default(),
        cover_color: r.get::<_, Option<String>>(4)?.unwrap_or_default(),
        isbn: r.get::<_, Option<String>>(5)?.unwrap_or_default(),
        publisher: r.get::<_, Option<String>>(6)?.unwrap_or_default(),
        publish_year: r.get::<_, Option<String>>(7)?.unwrap_or_default(),
        source_type: r.get(8)?,
        format: BookFormat::from_ext(&fmt_str).unwrap_or(BookFormat::Txt),
        file_path: r.get::<_, Option<String>>(10)?.unwrap_or_default(),
        file_size: r.get::<_, Option<i64>>(11)?.unwrap_or(0),
        word_count: r.get::<_, Option<i64>>(12)?.unwrap_or(0),
        category: r.get::<_, Option<String>>(13)?.unwrap_or_default(),
        library_id: r.get::<_, Option<String>>(14)?.unwrap_or_default(),
        tags,
        status: BookStatus::from_str(&status_str),
        import_progress: r.get::<_, Option<i64>>(17)?.unwrap_or(100),
        import_step: r.get::<_, Option<String>>(18)?.unwrap_or_default(),
        import_error: r.get::<_, Option<String>>(19)?.unwrap_or_default(),
        total_reading_seconds: r.get::<_, Option<i64>>(20)?.unwrap_or(0),
        last_read_at: r.get::<_, Option<String>>(21)?.unwrap_or_default(),
        description: r.get::<_, Option<String>>(22)?.unwrap_or_default(),
        chapters_count,
        created_at,
        progress,
    })
}

#[async_trait]
impl BookRepository for SqliteBookRepository {
    async fn find_by_id(&self, id: &str) -> AppResult<Option<Book>> {
        let id_owned = id.to_string();
        self.db.interact(move |conn| {
            let sql = "SELECT b.id, b.title, b.author, b.cover_url, b.cover_color, b.isbn, b.publisher, b.publish_year,
                              b.source_type, b.format, b.file_path, b.file_size, b.word_count, b.category, b.library_id,
                              b.tags, b.status, b.import_progress, b.import_step, b.import_error, b.total_reading_seconds,
                              b.last_read_at, b.description, b.created_at, COALESCE(b.chapters_count, 0),
                              rp.chapter_index, rp.scroll_offset, rp.cfi, rp.percentage, rp.device_name, rp.updated_at
                       FROM books b
                       LEFT JOIN reading_progress rp ON rp.book_id = b.id
                       WHERE b.id = ?";
            let mut stmt = conn.prepare(sql)?;
            let mut rows = stmt.query(params![id_owned])?;

            if let Some(r) = rows.next()? {
                Ok(Some(map_book_row(r)?))
            } else {
                Ok(None)
            }
        }).await
    }

    async fn list(&self, filter: &BookFilter) -> AppResult<Vec<Book>> {
        let lib_id = filter.library_id.clone();
        self.db.interact(move |conn| {
            let (sql, is_filtered) = match &lib_id {
                Some(id) if id != "all" && !id.is_empty() => (
                    "SELECT b.id, b.title, b.author, b.cover_url, b.cover_color, b.isbn, b.publisher, b.publish_year,
                            b.source_type, b.format, b.file_path, b.file_size, b.word_count, b.category, b.library_id,
                            b.tags, b.status, b.import_progress, b.import_step, b.import_error, b.total_reading_seconds,
                            b.last_read_at, b.description, b.created_at, COALESCE(b.chapters_count, 0),
                            rp.chapter_index, rp.scroll_offset, rp.cfi, rp.percentage, rp.device_name, rp.updated_at
                     FROM books b
                     LEFT JOIN reading_progress rp ON rp.book_id = b.id
                     WHERE b.library_id = ?
                     ORDER BY 
                        CASE 
                            WHEN (b.last_read_at IS NOT NULL AND b.last_read_at != '') OR rp.updated_at IS NOT NULL THEN 0 
                            ELSE 1 
                        END ASC,
                        COALESCE(NULLIF(b.last_read_at, ''), rp.updated_at, '') DESC,
                        b.created_at DESC",
                    true,
                ),
                _ => (
                    "SELECT b.id, b.title, b.author, b.cover_url, b.cover_color, b.isbn, b.publisher, b.publish_year,
                            b.source_type, b.format, b.file_path, b.file_size, b.word_count, b.category, b.library_id,
                            b.tags, b.status, b.import_progress, b.import_step, b.import_error, b.total_reading_seconds,
                            b.last_read_at, b.description, b.created_at, COALESCE(b.chapters_count, 0),
                            rp.chapter_index, rp.scroll_offset, rp.cfi, rp.percentage, rp.device_name, rp.updated_at
                     FROM books b
                     LEFT JOIN reading_progress rp ON rp.book_id = b.id
                     ORDER BY 
                        CASE 
                            WHEN (b.last_read_at IS NOT NULL AND b.last_read_at != '') OR rp.updated_at IS NOT NULL THEN 0 
                            ELSE 1 
                        END ASC,
                        COALESCE(NULLIF(b.last_read_at, ''), rp.updated_at, '') DESC,
                        b.created_at DESC",
                    false,
                ),
            };

            let mut stmt = conn.prepare(sql)?;
            let books = if is_filtered {
                let target = lib_id.unwrap_or_default();
                stmt.query_map(params![target], map_book_row)?.filter_map(|r| r.ok()).collect()
            } else {
                stmt.query_map([], map_book_row)?.filter_map(|r| r.ok()).collect()
            };

            Ok(books)
        }).await
    }

    async fn save(&self, book: &Book, chapters_raw_json: &str) -> AppResult<()> {
        let b = book.clone();
        let chapters = chapters_raw_json.to_string();
        self.db.interact(move |conn| {
            let tags_str = serde_json::to_string(&b.tags).unwrap_or_else(|_| "[]".into());
            conn.execute(
                "INSERT INTO books (
                    id, title, author, cover_url, cover_color, isbn, publisher, publish_year,
                    source_type, format, file_path, file_size, word_count, category, library_id, tags,
                    status, import_progress, import_step, import_error, total_reading_seconds, last_read_at,
                    description, chapters_json, chapters_count, created_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    author = excluded.author,
                    cover_url = excluded.cover_url,
                    cover_color = excluded.cover_color,
                    isbn = excluded.isbn,
                    publisher = excluded.publisher,
                    publish_year = excluded.publish_year,
                    source_type = excluded.source_type,
                    format = excluded.format,
                    file_path = excluded.file_path,
                    file_size = excluded.file_size,
                    word_count = excluded.word_count,
                    category = excluded.category,
                    library_id = excluded.library_id,
                    tags = excluded.tags,
                    status = excluded.status,
                    import_progress = excluded.import_progress,
                    import_step = excluded.import_step,
                    import_error = excluded.import_error,
                    total_reading_seconds = excluded.total_reading_seconds,
                    last_read_at = excluded.last_read_at,
                    description = excluded.description,
                    chapters_json = excluded.chapters_json,
                    chapters_count = excluded.chapters_count",
                params![
                    &b.id, &b.title, &b.author, &b.cover_url, &b.cover_color,
                    &b.isbn, &b.publisher, &b.publish_year, &b.source_type,
                    b.format.as_str(), &b.file_path, b.file_size, b.word_count,
                    &b.category, &b.library_id, &tags_str, b.status.as_str(),
                    b.import_progress, &b.import_step, &b.import_error,
                    b.total_reading_seconds, &b.last_read_at, &b.description,
                    &chapters, b.chapters_count as i64, &b.created_at,
                ],
            )?;
            Ok(())
        }).await
    }

    async fn update_meta(&self, book: &Book) -> AppResult<()> {
        let b = book.clone();
        self.db.interact(move |conn| {
            let tags_str = serde_json::to_string(&b.tags).unwrap_or_else(|_| "[]".into());
            let tx = conn.transaction()?;

            let existing_title_author: Option<(String, String)> = tx
                .query_row(
                    "SELECT title, author FROM books WHERE id = ?",
                    params![&b.id],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
                .optional()?;

            tx.execute(
                "UPDATE books SET title = ?, author = ?, category = ?, library_id = ?, description = ?, tags = ?, status = ?, last_read_at = ?, total_reading_seconds = ? WHERE id = ?",
                params![&b.title, &b.author, &b.category, &b.library_id, &b.description, &tags_str, b.status.as_str(), &b.last_read_at, b.total_reading_seconds, &b.id],
            )?;

            let title_or_author_changed = existing_title_author
                .map(|(old_t, old_a)| old_t != b.title || old_a != b.author)
                .unwrap_or(true);

            // Only rewrite book_paragraphs and book_fts if title or author actually changed
            if title_or_author_changed {
                tx.execute(
                    "UPDATE book_paragraphs SET book_title = ?, book_author = ? WHERE book_id = ?",
                    params![&b.title, &b.author, &b.id],
                )?;
                tx.execute(
                    "UPDATE book_fts SET book_title = ? WHERE book_id = ?",
                    params![&b.title, &b.id],
                )?;
                let _ = tx.execute(
                    "UPDATE ai_conversations SET book_title = ?, book_author = ? WHERE book_id = ?",
                    params![&b.title, &b.author, &b.id],
                );
            }

            tx.commit()?;
            Ok(())
        }).await
    }

    async fn update_reading_state(&self, id: &str, status: &str, last_read_at: &str, total_reading_seconds: i64) -> AppResult<()> {
        let bid = id.to_string();
        let st = status.to_string();
        let lr = last_read_at.to_string();
        self.db.interact(move |conn| {
            conn.execute(
                "UPDATE books SET status = ?, last_read_at = ?, total_reading_seconds = ? WHERE id = ?",
                params![&st, &lr, total_reading_seconds, &bid],
            )?;
            Ok(())
        }).await
    }

    async fn update_import_status(&self, id: &str, progress: i64, step: &str, status: &str, error: &str) -> AppResult<()> {
        let bid = id.to_string();
        let s = step.to_string();
        let st = status.to_string();
        let err = error.to_string();
        self.db.interact(move |conn| {
            conn.execute(
                "UPDATE books SET import_progress = ?, import_step = ?, status = ?, import_error = ? WHERE id = ?",
                params![progress, &s, &st, &err, &bid],
            )?;
            Ok(())
        }).await
    }

    async fn delete(&self, id: &str) -> AppResult<()> {
        let id_owned = id.to_string();
        self.db.interact(move |conn| {
            let tx = conn.transaction()?;
            tx.execute("DELETE FROM books WHERE id = ?", params![&id_owned])?;
            tx.execute("DELETE FROM reading_progress WHERE book_id = ?", params![&id_owned])?;
            tx.execute("DELETE FROM highlights WHERE book_id = ?", params![&id_owned])?;
            tx.execute("DELETE FROM bookmarks WHERE book_id = ?", params![&id_owned])?;
            tx.execute("DELETE FROM book_paragraphs WHERE book_id = ?", params![&id_owned])?;
            tx.execute("DELETE FROM book_fts WHERE book_id = ?", params![&id_owned])?;
            let _ = tx.execute("DELETE FROM reading_sessions WHERE book_id = ?", params![&id_owned]);
            let _ = tx.execute("DELETE FROM download_tasks WHERE book_id = ?", params![&id_owned]);
            let _ = tx.execute("DELETE FROM ai_conversations WHERE book_id = ?", params![&id_owned]);
            tx.commit()?;
            Ok(())
        }).await
    }

    async fn get_raw_chapters(&self, id: &str) -> AppResult<Option<String>> {
        let bid = id.to_string();
        self.db.interact(move |conn| {
            let res: rusqlite::Result<String> = conn.query_row(
                "SELECT chapters_json FROM books WHERE id = ?",
                params![&bid],
                |r| r.get(0),
            );
            Ok(res.ok())
        }).await
    }

    async fn get_character_graph(&self, id: &str) -> AppResult<Option<String>> {
        let bid = id.to_string();
        self.db.interact(move |conn| {
            let res: rusqlite::Result<String> = conn.query_row(
                "SELECT character_graph_json FROM books WHERE id = ?",
                params![&bid],
                |r| r.get(0),
            );
            Ok(res.ok())
        }).await
    }

    async fn batch_index_paragraphs(
        &self,
        book_id: &str,
        title: &str,
        author: &str,
        cover_color: &str,
        paragraphs: &[(usize, usize, i64, String, String)],
    ) -> AppResult<()> {
        let bid = book_id.to_string();
        let btitle = title.to_string();
        let bauthor = author.to_string();
        let bcolor = cover_color.to_string();
        let data = paragraphs.to_vec();

        self.db.interact(move |conn| {
            let tx = conn.transaction()?;
            tx.execute("DELETE FROM book_paragraphs WHERE book_id = ?", params![&bid])?;
            tx.execute("DELETE FROM book_fts WHERE book_id = ?", params![&bid])?;

            {
                let mut ins_para = tx.prepare(
                    "INSERT INTO book_paragraphs 
                     (id, book_id, book_title, book_author, cover_color, chapter_index, chapter_title, paragraph_index, char_offset, content)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )?;
                let mut ins_fts = tx.prepare(
                    "INSERT INTO book_fts 
                     (paragraph_id, book_id, chapter_index, paragraph_index, book_title, chapter_title, content)
                     VALUES (?, ?, ?, ?, ?, ?, ?)"
                )?;

                for (ch_idx, p_idx, offset, text, ch_title) in &data {
                    let para_id = format!("{}_c{}_p{}", bid, ch_idx, p_idx);
                    ins_para.execute(params![
                        &para_id, &bid, &btitle, &bauthor, &bcolor,
                        *ch_idx as i64, ch_title, *p_idx as i64, *offset, text
                    ])?;
                    ins_fts.execute(params![
                        &para_id, &bid, ch_idx.to_string(), p_idx.to_string(),
                        &btitle, ch_title, text
                    ])?;
                }
            }

            tx.commit()?;
            Ok(())
        }).await
    }

    async fn count_all(&self) -> AppResult<(i64, i64)> {
        self.db.interact(|conn| {
            let books: i64 = conn.query_row("SELECT COUNT(*) FROM books", [], |r| r.get(0)).unwrap_or(0);
            let paras: i64 = conn.query_row("SELECT COUNT(*) FROM book_paragraphs", [], |r| r.get(0)).unwrap_or(0);
            Ok((books, paras))
        }).await
    }

    async fn get_stats_overview(&self) -> AppResult<serde_json::Value> {
        self.db.interact(|conn| {
            let (total_books, total_seconds, total_words, finished_count, reading_count): (i64, i64, i64, i64, i64) = conn.query_row(
                "SELECT COUNT(*),
                        COALESCE(SUM(total_reading_seconds), 0),
                        COALESCE(SUM(word_count), 0),
                        COALESCE(SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END), 0),
                        COALESCE(SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END), 0)
                 FROM books",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
            ).unwrap_or((0, 0, 0, 0, 0));

            let indexed_paragraphs: i64 = conn.query_row("SELECT COUNT(*) FROM book_paragraphs", [], |r| r.get(0)).unwrap_or(0);
            let hl_count: i64 = conn.query_row("SELECT COUNT(*) FROM highlights", [], |r| r.get(0)).unwrap_or(0);
            let notes_count: i64 = conn.query_row("SELECT COUNT(*) FROM highlights WHERE note IS NOT NULL AND TRIM(note) != ''", [], |r| r.get(0)).unwrap_or(0);

            let mut session_map: HashMap<String, (i64, i64)> = HashMap::new();
            if let Ok(mut stmt) = conn.prepare(
                "SELECT session_date, SUM(duration_seconds), SUM(words_read)
                 FROM reading_sessions
                 GROUP BY session_date
                 ORDER BY session_date ASC"
            ) {
                if let Ok(mut rows) = stmt.query([]) {
                    while let Ok(Some(row)) = rows.next() {
                        let d: String = row.get(0).unwrap_or_default();
                        let secs: i64 = row.get(1).unwrap_or(0);
                        let words: i64 = row.get(2).unwrap_or(0);
                        session_map.insert(d, (secs, words));
                    }
                }
            }

            let now = chrono::Local::now();
            let today_str = now.format("%Y-%m-%d").to_string();
            let today_entry = session_map.get(&today_str).copied().unwrap_or((0, 0));
            let today_seconds = today_entry.0;

            let mut heatmap = Vec::new();
            for i in (0..35).rev() {
                let day = now - chrono::Duration::days(i);
                let day_str = day.format("%Y-%m-%d").to_string();
                let (secs, words) = session_map.get(&day_str).copied().unwrap_or((0, 0));
                let level = if secs == 0 {
                    0
                } else if secs < 1200 {
                    1
                } else if secs < 2400 {
                    2
                } else if secs < 3600 {
                    3
                } else {
                    4
                };
                heatmap.push(serde_json::json!({
                    "date": day_str,
                    "minutes": (secs as f64 / 60.0).round() as i64,
                    "words": words,
                    "level": level,
                }));
            }

            let mut streak_days = 0;
            for i in 0..=365 {
                let day = now - chrono::Duration::days(i);
                let day_str = day.format("%Y-%m-%d").to_string();
                if let Some(&(secs, _)) = session_map.get(&day_str) {
                    if secs > 0 {
                        streak_days += 1;
                        continue;
                    }
                }
                if i == 0 {
                    continue;
                } else {
                    break;
                }
            }

            let effective_total_seconds = total_seconds.max(today_seconds);
            let total_reading_hours = ((effective_total_seconds as f64 / 3600.0) * 10.0).round() / 10.0;

            Ok(serde_json::json!({
                "ok": true,
                "engine": "Rust Axum + SQLite WAL FTS5",
                "total_books": total_books,
                "books_count": total_books,
                "total_paragraphs": indexed_paragraphs,
                "indexed_paragraphs": indexed_paragraphs,
                "total_reading_seconds": effective_total_seconds,
                "total_reading_hours": total_reading_hours,
                "today_reading_seconds": today_seconds,
                "today_reading_minutes": (today_seconds as f64 / 60.0).round() as i64,
                "reading_books": reading_count,
                "finished_books": finished_count,
                "total_words_in_library": total_words,
                "highlights_count": hl_count,
                "notes_count": notes_count,
                "streak_days": streak_days,
                "heatmap": heatmap,
            }))
        }).await
    }

    async fn record_session(&self, book_id: &str, duration_seconds: i64) -> AppResult<serde_json::Value> {
        let bid = book_id.to_string();
        self.db.interact(move |conn| {
            let duration = duration_seconds.max(1).min(120);
            let now = chrono::Local::now();
            let date_str = now.format("%Y-%m-%d").to_string();
            let now_iso = now.to_rfc3339();
            let pages = (duration as f64 / 120.0).round() as i64;
            let words = ((duration as f64 / 60.0) * 350.0).round() as i64;

            let existing: Option<String> = conn.query_row(
                "SELECT id FROM reading_sessions WHERE book_id = ? AND session_date = ? LIMIT 1",
                params![&bid, &date_str],
                |r| r.get(0),
            ).optional()?;

            let session_id = if let Some(sid) = existing {
                conn.execute(
                    "UPDATE reading_sessions
                     SET duration_seconds = duration_seconds + ?,
                         pages_read = pages_read + ?,
                         words_read = words_read + ?
                     WHERE id = ?",
                    params![duration, pages, words, &sid],
                )?;
                sid
            } else {
                let sid = format!("sess_{}_{}_{}", date_str, now.timestamp_millis(), now.timestamp_subsec_micros());
                conn.execute(
                    "INSERT INTO reading_sessions (id, book_id, duration_seconds, pages_read, words_read, session_date, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                    params![&sid, &bid, duration, pages, words, &date_str, &now_iso],
                )?;
                sid
            };

            conn.execute(
                "UPDATE books SET total_reading_seconds = total_reading_seconds + ?, last_read_at = ? WHERE id = ?",
                params![duration, &now_iso, &bid],
            )?;

            Ok(serde_json::json!({
                "ok": true,
                "session_id": session_id,
                "duration_seconds": duration,
            }))
        }).await
    }
}
