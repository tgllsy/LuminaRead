use async_trait::async_trait;
use rusqlite::params;
use crate::domain::entities::reader::{Bookmark, Highlight, ReadingProgress};
use crate::domain::traits::ReaderRepository;
use crate::error::AppResult;
use crate::infra::db::pool::DbContext;

pub struct SqliteReaderRepository {
    db: DbContext,
}

impl SqliteReaderRepository {
    pub fn new(db: DbContext) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ReaderRepository for SqliteReaderRepository {
    async fn get_progress(&self, book_id: &str) -> AppResult<Option<ReadingProgress>> {
        let bid = book_id.to_string();
        self.db.interact(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT book_id, chapter_index, scroll_offset, cfi, percentage, device_name, updated_at
                 FROM reading_progress WHERE book_id = ?"
            )?;
            let mut rows = stmt.query(params![bid])?;
            if let Some(r) = rows.next()? {
                Ok(Some(ReadingProgress {
                    book_id: r.get(0)?,
                    chapter_index: r.get(1)?,
                    scroll_offset: r.get(2)?,
                    cfi: r.get(3)?,
                    percentage: r.get(4)?,
                    device_name: r.get(5)?,
                    updated_at: r.get(6)?,
                }))
            } else {
                Ok(None)
            }
        }).await
    }

    async fn save_progress(&self, progress: &ReadingProgress) -> AppResult<()> {
        let p = progress.clone();
        self.db.interact(move |conn| {
            conn.execute(
                "INSERT INTO reading_progress 
                 (book_id, chapter_index, scroll_offset, cfi, percentage, device_name, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 ON CONFLICT(book_id) DO UPDATE SET
                   chapter_index = excluded.chapter_index,
                   scroll_offset = excluded.scroll_offset,
                   cfi = excluded.cfi,
                   percentage = excluded.percentage,
                   device_name = excluded.device_name,
                   updated_at = excluded.updated_at",
                params![&p.book_id, p.chapter_index, p.scroll_offset, &p.cfi, p.percentage, &p.device_name, &p.updated_at],
            )?;
            Ok(())
        }).await
    }

    async fn list_highlights(&self, book_id: Option<&str>, has_note: Option<bool>) -> AppResult<Vec<Highlight>> {
        let bid = book_id.map(|s| s.to_string());
        self.db.interact(move |conn| {
            let mut sql = String::from(
                "SELECT h.id, h.book_id, h.chapter_index, h.chapter_title, h.selected_text,
                        h.paragraph_index, h.start_offset, h.end_offset, h.cfi_range, h.style_type,
                        h.color, h.note, h.created_at, h.updated_at, b.title
                 FROM highlights h LEFT JOIN books b ON b.id = h.book_id
                 WHERE 1=1"
            );
            if bid.is_some() {
                sql.push_str(" AND h.book_id = ?");
            }
            if let Some(hn) = has_note {
                if hn {
                    sql.push_str(" AND h.note IS NOT NULL AND TRIM(h.note) != ''");
                } else {
                    sql.push_str(" AND (h.note IS NULL OR TRIM(h.note) = '')");
                }
            }
            sql.push_str(" ORDER BY h.created_at DESC");

            let mut stmt = conn.prepare(&sql)?;
            let map_fn = |r: &rusqlite::Row| -> rusqlite::Result<Highlight> {
                Ok(Highlight {
                    id: r.get(0)?,
                    book_id: r.get(1)?,
                    chapter_index: r.get(2)?,
                    chapter_title: r.get(3)?,
                    selected_text: r.get(4)?,
                    paragraph_index: r.get(5)?,
                    start_offset: r.get(6)?,
                    end_offset: r.get(7)?,
                    cfi_range: r.get(8)?,
                    style_type: r.get(9)?,
                    color: r.get(10)?,
                    note: r.get(11)?,
                    created_at: r.get(12)?,
                    updated_at: r.get(13)?,
                    book_title: r.get(14)?,
                })
            };

            let items: Vec<Highlight> = if let Some(b) = &bid {
                stmt.query_map(params![b], map_fn)?.filter_map(|r| r.ok()).collect()
            } else {
                stmt.query_map([], map_fn)?.filter_map(|r| r.ok()).collect()
            };
            Ok(items)
        }).await
    }

    async fn get_daily_review(&self) -> AppResult<Vec<Highlight>> {
        self.db.interact(|conn| {
            let mut stmt = conn.prepare(
                "SELECT h.id, h.book_id, h.chapter_index, h.chapter_title, h.selected_text,
                        h.paragraph_index, h.start_offset, h.end_offset, h.cfi_range, h.style_type,
                        h.color, h.note, h.created_at, h.updated_at, b.title
                 FROM highlights h LEFT JOIN books b ON b.id = h.book_id
                 ORDER BY RANDOM() LIMIT 5"
            )?;
            let items = stmt.query_map([], |r| {
                Ok(Highlight {
                    id: r.get(0)?,
                    book_id: r.get(1)?,
                    chapter_index: r.get(2)?,
                    chapter_title: r.get(3)?,
                    selected_text: r.get(4)?,
                    paragraph_index: r.get(5)?,
                    start_offset: r.get(6)?,
                    end_offset: r.get(7)?,
                    cfi_range: r.get(8)?,
                    style_type: r.get(9)?,
                    color: r.get(10)?,
                    note: r.get(11)?,
                    created_at: r.get(12)?,
                    updated_at: r.get(13)?,
                    book_title: r.get(14)?,
                })
            })?.filter_map(|r| r.ok()).collect();
            Ok(items)
        }).await
    }

    async fn create_highlight(&self, h: &Highlight) -> AppResult<()> {
        let hl = h.clone();
        self.db.interact(move |conn| {
            conn.execute(
                "INSERT INTO highlights 
                 (id, book_id, chapter_index, chapter_title, selected_text, paragraph_index,
                  start_offset, end_offset, cfi_range, style_type, color, note, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    &hl.id, &hl.book_id, hl.chapter_index, &hl.chapter_title, &hl.selected_text,
                    hl.paragraph_index, hl.start_offset, hl.end_offset, &hl.cfi_range,
                    &hl.style_type, &hl.color, &hl.note, &hl.created_at, &hl.updated_at
                ],
            )?;
            Ok(())
        }).await
    }

    async fn update_highlight(
        &self,
        id: &str,
        color: &str,
        style_type: Option<&str>,
        note: Option<&str>,
    ) -> AppResult<Option<Highlight>> {
        let hid = id.to_string();
        let c = color.trim().to_string();
        let st = style_type.map(|s| s.to_string());
        let n = note.map(|s| s.to_string());
        let now = chrono::Local::now().to_rfc3339();
        self.db.interact(move |conn| {
            conn.execute(
                "UPDATE highlights
                 SET color = CASE WHEN ?1 = '' THEN color ELSE ?1 END,
                     style_type = COALESCE(?2, style_type),
                     note = COALESCE(?3, note),
                     updated_at = ?4
                 WHERE id = ?5",
                params![&c, &st, &n, &now, &hid],
            )?;

            let mut stmt = conn.prepare(
                "SELECT h.id, h.book_id, h.chapter_index, h.chapter_title, h.selected_text,
                        h.paragraph_index, h.start_offset, h.end_offset, h.cfi_range,
                        h.style_type, h.color, h.note, h.created_at, h.updated_at,
                        b.title AS book_title
                 FROM highlights h
                 LEFT JOIN books b ON b.id = h.book_id
                 WHERE h.id = ?"
            )?;
            let mut rows = stmt.query(params![&hid])?;
            if let Some(r) = rows.next()? {
                Ok(Some(Highlight {
                    id: r.get(0)?,
                    book_id: r.get(1)?,
                    chapter_index: r.get(2)?,
                    chapter_title: r.get(3)?,
                    selected_text: r.get(4)?,
                    paragraph_index: r.get(5)?,
                    start_offset: r.get(6)?,
                    end_offset: r.get(7)?,
                    cfi_range: r.get(8)?,
                    style_type: r.get(9)?,
                    color: r.get(10)?,
                    note: r.get(11)?,
                    created_at: r.get(12)?,
                    updated_at: r.get(13)?,
                    book_title: r.get(14)?,
                }))
            } else {
                Ok(None)
            }
        }).await
    }

    async fn delete_highlight(&self, id: &str) -> AppResult<()> {
        let hid = id.to_string();
        self.db.interact(move |conn| {
            conn.execute("DELETE FROM highlights WHERE id = ?", params![&hid])?;
            Ok(())
        }).await
    }

    async fn list_bookmarks(&self, book_id: &str) -> AppResult<Vec<Bookmark>> {
        let bid = book_id.to_string();
        self.db.interact(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, book_id, chapter_index, chapter_title, snippet, percentage, scroll_offset, created_at
                 FROM bookmarks WHERE book_id = ? ORDER BY chapter_index, created_at DESC"
            )?;
            let items = stmt.query_map(params![&bid], |r| {
                Ok(Bookmark {
                    id: r.get(0)?,
                    book_id: r.get(1)?,
                    chapter_index: r.get(2)?,
                    chapter_title: r.get(3)?,
                    snippet: r.get(4)?,
                    percentage: r.get(5)?,
                    scroll_offset: r.get(6)?,
                    created_at: r.get(7)?,
                })
            })?.filter_map(|r| r.ok()).collect();
            Ok(items)
        }).await
    }

    async fn create_bookmark(&self, b: &Bookmark) -> AppResult<()> {
        let bm = b.clone();
        self.db.interact(move |conn| {
            conn.execute(
                "INSERT INTO bookmarks 
                 (id, book_id, chapter_index, chapter_title, snippet, percentage, scroll_offset, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    &bm.id, &bm.book_id, bm.chapter_index, &bm.chapter_title,
                    &bm.snippet, bm.percentage, bm.scroll_offset, &bm.created_at
                ],
            )?;
            Ok(())
        }).await
    }

    async fn delete_bookmark(&self, id: &str) -> AppResult<()> {
        let bid = id.to_string();
        self.db.interact(move |conn| {
            conn.execute("DELETE FROM bookmarks WHERE id = ?", params![&bid])?;
            Ok(())
        }).await
    }

    async fn resolve_paragraph_location(
        &self,
        book_id: &str,
        text_probe: &str,
    ) -> AppResult<Option<(usize, String, usize, Option<String>)>> {
        let bid = book_id.to_string();
        let escaped_probe = text_probe
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        self.db.interact(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT p.chapter_index, p.chapter_title, p.paragraph_index, b.title
                 FROM book_paragraphs p
                 LEFT JOIN books b ON b.id = p.book_id
                 WHERE p.book_id = ? AND p.content LIKE '%' || ? || '%' ESCAPE '\\'
                 ORDER BY p.chapter_index ASC, p.paragraph_index ASC
                 LIMIT 1"
            )?;
            let mut rows = stmt.query(params![bid, escaped_probe])?;
            if let Some(r) = rows.next()? {
                let ch_idx = r.get::<_, i64>(0)? as usize;
                let ch_title: String = r.get(1)?;
                let p_idx = r.get::<_, i64>(2)? as usize;
                let b_title: Option<String> = r.get(3)?;
                Ok(Some((ch_idx, ch_title, p_idx, b_title)))
            } else {
                Ok(None)
            }
        }).await
    }
}
