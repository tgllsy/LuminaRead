use async_trait::async_trait;
use rusqlite::params;
use serde_json::Value;
use crate::domain::entities::conversation::AiConversation;
use crate::domain::traits::ConversationRepository;
use crate::error::AppResult;
use crate::infra::db::pool::DbContext;

pub struct SqliteConversationRepository {
    db: DbContext,
}

impl SqliteConversationRepository {
    pub fn new(db: DbContext) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ConversationRepository for SqliteConversationRepository {
    async fn find_by_id(&self, id: &str) -> AppResult<Option<AiConversation>> {
        let cid = id.to_string();
        self.db.interact(move |conn| {
            let mut stmt = conn.prepare("SELECT * FROM ai_conversations WHERE id = ?")?;
            let mut rows = stmt.query(params![cid])?;
            if let Some(r) = rows.next()? {
                let is_pinned_int: i64 = r.get(15)?;
                Ok(Some(AiConversation {
                    id: r.get(0)?,
                    book_id: r.get(1)?,
                    book_title: r.get(2)?,
                    book_author: r.get(3)?,
                    cover_color: r.get(4)?,
                    chapter_index: r.get(5)?,
                    chapter_title: r.get(6)?,
                    paragraph_index: r.get(7)?,
                    selected_text: r.get(8)?,
                    mode: r.get(9)?,
                    question: r.get(10)?,
                    answer_title: r.get(11)?,
                    answer_content: r.get(12)?,
                    engine: r.get(13)?,
                    follow_ups_json: r.get(14)?,
                    is_pinned: is_pinned_int != 0,
                    saved_highlight_id: r.get(16)?,
                    created_at: r.get(17)?,
                    updated_at: r.get(18)?,
                }))
            } else {
                Ok(None)
            }
        }).await
    }

    async fn list(&self, book_id: Option<&str>, q: Option<&str>) -> AppResult<Vec<AiConversation>> {
        let bid = book_id.map(|s| s.to_string());
        let query_str = q.map(|s| s.to_string());
        self.db.interact(move |conn| {
            let mut sql = String::from("SELECT * FROM ai_conversations WHERE 1=1");
            if bid.is_some() {
                sql.push_str(" AND book_id = ?");
            }
            if query_str.is_some() {
                sql.push_str(" AND (question LIKE '%' || ? || '%' OR answer_title LIKE '%' || ? || '%' OR answer_content LIKE '%' || ? || '%' OR selected_text LIKE '%' || ? || '%')");
            }
            sql.push_str(" ORDER BY is_pinned DESC, created_at DESC");

            let mut stmt = conn.prepare(&sql)?;
            let map_fn = |r: &rusqlite::Row| -> rusqlite::Result<AiConversation> {
                let is_pinned_int: i64 = r.get(15)?;
                Ok(AiConversation {
                    id: r.get(0)?,
                    book_id: r.get(1)?,
                    book_title: r.get(2)?,
                    book_author: r.get(3)?,
                    cover_color: r.get(4)?,
                    chapter_index: r.get(5)?,
                    chapter_title: r.get(6)?,
                    paragraph_index: r.get(7)?,
                    selected_text: r.get(8)?,
                    mode: r.get(9)?,
                    question: r.get(10)?,
                    answer_title: r.get(11)?,
                    answer_content: r.get(12)?,
                    engine: r.get(13)?,
                    follow_ups_json: r.get(14)?,
                    is_pinned: is_pinned_int != 0,
                    saved_highlight_id: r.get(16)?,
                    created_at: r.get(17)?,
                    updated_at: r.get(18)?,
                })
            };

            let items: Vec<AiConversation> = match (&bid, &query_str) {
                (Some(b), Some(q)) => stmt.query_map(params![b, q, q, q, q], map_fn)?.filter_map(|r| r.ok()).collect(),
                (Some(b), None) => stmt.query_map(params![b], map_fn)?.filter_map(|r| r.ok()).collect(),
                (None, Some(q)) => stmt.query_map(params![q, q, q, q], map_fn)?.filter_map(|r| r.ok()).collect(),
                (None, None) => stmt.query_map([], map_fn)?.filter_map(|r| r.ok()).collect(),
            };
            Ok(items)
        }).await
    }

    async fn create(&self, c: &AiConversation) -> AppResult<()> {
        let conv = c.clone();
        self.db.interact(move |conn| {
            conn.execute(
                "INSERT INTO ai_conversations 
                 (id, book_id, book_title, book_author, cover_color, chapter_index, chapter_title,
                  paragraph_index, selected_text, mode, question, answer_title, answer_content,
                  engine, follow_ups_json, is_pinned, saved_highlight_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    &conv.id, &conv.book_id, &conv.book_title, &conv.book_author, &conv.cover_color,
                    conv.chapter_index, &conv.chapter_title, conv.paragraph_index, &conv.selected_text,
                    &conv.mode, &conv.question, &conv.answer_title, &conv.answer_content,
                    &conv.engine, &conv.follow_ups_json, if conv.is_pinned { 1 } else { 0 }, &conv.saved_highlight_id,
                    &conv.created_at, &conv.updated_at
                ],
            )?;
            Ok(())
        }).await
    }

    async fn update(&self, c: &AiConversation) -> AppResult<()> {
        let conv = c.clone();
        self.db.interact(move |conn| {
            conn.execute(
                "UPDATE ai_conversations SET
                    book_title = ?, book_author = ?, cover_color = ?,
                    chapter_index = ?, chapter_title = ?, paragraph_index = ?, selected_text = ?,
                    mode = ?, question = ?, answer_title = ?, answer_content = ?,
                    engine = ?, follow_ups_json = ?, is_pinned = ?, saved_highlight_id = ?, updated_at = ?
                 WHERE id = ?",
                params![
                    &conv.book_title, &conv.book_author, &conv.cover_color,
                    conv.chapter_index, &conv.chapter_title, conv.paragraph_index, &conv.selected_text,
                    &conv.mode, &conv.question, &conv.answer_title, &conv.answer_content,
                    &conv.engine, &conv.follow_ups_json, if conv.is_pinned { 1 } else { 0 }, &conv.saved_highlight_id,
                    &conv.updated_at, &conv.id
                ],
            )?;
            Ok(())
        }).await
    }

    async fn update_pin(&self, id: &str, is_pinned: bool) -> AppResult<()> {
        let cid = id.to_string();
        let now = chrono::Local::now().to_rfc3339();
        let pin_val = if is_pinned { 1 } else { 0 };
        self.db.interact(move |conn| {
            conn.execute(
                "UPDATE ai_conversations SET is_pinned = ?, updated_at = ? WHERE id = ?",
                params![pin_val, &now, &cid],
            )?;
            Ok(())
        }).await
    }

    async fn delete(&self, id: &str) -> AppResult<()> {
        let cid = id.to_string();
        self.db.interact(move |conn| {
            conn.execute("DELETE FROM ai_conversations WHERE id = ?", params![&cid])?;
            Ok(())
        }).await
    }

    async fn get_notes_hub(&self, book_id: Option<&str>) -> AppResult<Value> {
        let bid_filter = book_id
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty() && s != "all");

        self.db.interact(move |conn| {
            let conv_map = |r: &rusqlite::Row| -> rusqlite::Result<serde_json::Value> {
                let is_pinned_int: i64 = r.get(15)?;
                let follow_ups_str: Option<String> = r.get(14)?;
                let follow_ups: Vec<String> = follow_ups_str
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default();

                Ok(serde_json::json!({
                    "id": r.get::<_, String>(0)?,
                    "book_id": r.get::<_, Option<String>>(1)?,
                    "book_title": r.get::<_, String>(2)?,
                    "book_author": r.get::<_, Option<String>>(3)?,
                    "cover_color": r.get::<_, Option<String>>(4)?,
                    "chapter_index": r.get::<_, i64>(5)?,
                    "chapter_title": r.get::<_, Option<String>>(6)?,
                    "paragraph_index": r.get::<_, i64>(7)?,
                    "selected_text": r.get::<_, Option<String>>(8)?,
                    "mode": r.get::<_, String>(9)?,
                    "question": r.get::<_, String>(10)?,
                    "answer_title": r.get::<_, String>(11)?,
                    "answer_content": r.get::<_, String>(12)?,
                    "engine": r.get::<_, Option<String>>(13)?,
                    "follow_ups": follow_ups,
                    "is_pinned": is_pinned_int != 0,
                    "saved_highlight_id": r.get::<_, Option<String>>(16)?,
                    "created_at": r.get::<_, String>(17)?,
                    "updated_at": r.get::<_, String>(18)?,
                }))
            };

            let all_conversations: Vec<serde_json::Value> = if let Some(ref f) = bid_filter {
                let mut stmt = conn.prepare(
                    "SELECT * FROM ai_conversations WHERE book_id = ? ORDER BY is_pinned DESC, updated_at DESC, created_at DESC"
                )?;
                let res: Vec<_> = stmt.query_map(params![f], conv_map)?.filter_map(|r| r.ok()).collect();
                res
            } else {
                let mut stmt = conn.prepare(
                    "SELECT * FROM ai_conversations ORDER BY is_pinned DESC, updated_at DESC, created_at DESC"
                )?;
                let res: Vec<_> = stmt.query_map([], conv_map)?.filter_map(|r| r.ok()).collect();
                res
            };

            let hl_map = |r: &rusqlite::Row| -> rusqlite::Result<serde_json::Value> {
                Ok(serde_json::json!({
                    "id": r.get::<_, String>(0)?,
                    "book_id": r.get::<_, String>(1)?,
                    "chapter_index": r.get::<_, i64>(2)?,
                    "chapter_title": r.get::<_, String>(3)?,
                    "selected_text": r.get::<_, String>(4)?,
                    "paragraph_index": r.get::<_, i64>(5)?,
                    "start_offset": r.get::<_, i64>(6)?,
                    "end_offset": r.get::<_, i64>(7)?,
                    "cfi_range": r.get::<_, Option<String>>(8)?,
                    "style_type": r.get::<_, String>(9)?,
                    "color": r.get::<_, String>(10)?,
                    "note": r.get::<_, Option<String>>(11)?,
                    "created_at": r.get::<_, String>(12)?,
                    "updated_at": r.get::<_, String>(13)?,
                    "book_title": r.get::<_, Option<String>>(14)?,
                    "book_author": r.get::<_, Option<String>>(15)?,
                    "cover_url": r.get::<_, Option<String>>(16)?,
                    "cover_color": r.get::<_, Option<String>>(17)?,
                    "category": r.get::<_, Option<String>>(18)?,
                }))
            };

            let all_highlights: Vec<serde_json::Value> = if let Some(ref f) = bid_filter {
                let mut stmt = conn.prepare(
                    "SELECT h.*, b.title AS book_title, b.author AS book_author, b.cover_url, b.cover_color, b.category
                     FROM highlights h
                     LEFT JOIN books b ON b.id = h.book_id
                     WHERE h.book_id = ?
                     ORDER BY h.updated_at DESC, h.created_at DESC"
                )?;
                let res: Vec<_> = stmt.query_map(params![f], hl_map)?.filter_map(|r| r.ok()).collect();
                res
            } else {
                let mut stmt = conn.prepare(
                    "SELECT h.*, b.title AS book_title, b.author AS book_author, b.cover_url, b.cover_color, b.category
                     FROM highlights h
                     LEFT JOIN books b ON b.id = h.book_id
                     ORDER BY h.updated_at DESC, h.created_at DESC"
                )?;
                let res: Vec<_> = stmt.query_map([], hl_map)?.filter_map(|r| r.ok()).collect();
                res
            };

            let bm_map = |r: &rusqlite::Row| -> rusqlite::Result<serde_json::Value> {
                Ok(serde_json::json!({
                    "id": r.get::<_, String>(0)?,
                    "book_id": r.get::<_, String>(1)?,
                    "chapter_index": r.get::<_, i64>(2)?,
                    "chapter_title": r.get::<_, String>(3)?,
                    "snippet": r.get::<_, String>(4)?,
                    "percentage": r.get::<_, f64>(5)?,
                    "scroll_offset": r.get::<_, f64>(6)?,
                    "created_at": r.get::<_, String>(7)?,
                    "book_title": r.get::<_, Option<String>>(8)?,
                    "book_author": r.get::<_, Option<String>>(9)?,
                    "cover_url": r.get::<_, Option<String>>(10)?,
                    "cover_color": r.get::<_, Option<String>>(11)?,
                }))
            };

            let all_bookmarks: Vec<serde_json::Value> = if let Some(ref f) = bid_filter {
                let mut stmt = conn.prepare(
                    "SELECT bm.*, b.title AS book_title, b.author AS book_author, b.cover_url, b.cover_color
                     FROM bookmarks bm
                     LEFT JOIN books b ON b.id = bm.book_id
                     WHERE bm.book_id = ?
                     ORDER BY bm.created_at DESC"
                )?;
                let res: Vec<_> = stmt.query_map(params![f], bm_map)?.filter_map(|r| r.ok()).collect();
                res
            } else {
                let mut stmt = conn.prepare(
                    "SELECT bm.*, b.title AS book_title, b.author AS book_author, b.cover_url, b.cover_color
                     FROM bookmarks bm
                     LEFT JOIN books b ON b.id = bm.book_id
                     ORDER BY bm.created_at DESC"
                )?;
                let res: Vec<_> = stmt.query_map([], bm_map)?.filter_map(|r| r.ok()).collect();
                res
            };

            let mut active_books = std::collections::HashSet::new();
            for h in &all_highlights {
                if let Some(bid) = h.get("book_id").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
                    active_books.insert(bid.to_string());
                }
            }
            for b in &all_bookmarks {
                if let Some(bid) = b.get("book_id").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
                    active_books.insert(bid.to_string());
                }
            }
            for c in &all_conversations {
                if let Some(bid) = c.get("book_id").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
                    active_books.insert(bid.to_string());
                }
            }

            let total_notes = all_highlights.iter().filter(|h| {
                h.get("note").and_then(|v| v.as_str()).map(|s| !s.trim().is_empty()).unwrap_or(false)
            }).count();

            let stats = serde_json::json!({
                "total_highlights": all_highlights.len(),
                "total_notes": total_notes,
                "total_bookmarks": all_bookmarks.len(),
                "total_ai_conversations": all_conversations.len(),
                "books_with_records": active_books.len(),
            });

            Ok(serde_json::json!({
                "ok": true,
                "stats": stats,
                "highlights": all_highlights,
                "bookmarks": all_bookmarks,
                "ai_conversations": all_conversations,
            }))
        }).await
    }
}
