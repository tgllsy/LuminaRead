use async_trait::async_trait;
use rusqlite::params;
use crate::domain::entities::source::{BookSource, DownloadTask};
use crate::domain::traits::SourceRepository;
use crate::error::AppResult;
use crate::infra::db::pool::DbContext;

pub struct SqliteSourceRepository {
    db: DbContext,
}

impl SqliteSourceRepository {
    pub fn new(db: DbContext) -> Self {
        Self { db }
    }
}

#[async_trait]
impl SourceRepository for SqliteSourceRepository {
    async fn list_sources(&self) -> AppResult<Vec<BookSource>> {
        self.db.interact(|conn| {
            let mut stmt = conn.prepare("SELECT * FROM book_sources ORDER BY priority ASC")?;
            let items = stmt.query_map([], |r| {
                Ok(BookSource {
                    id: r.get(0)?,
                    source_type: r.get(1)?,
                    name: r.get(2)?,
                    description: r.get(3)?,
                    base_url: r.get(4)?,
                    mirror_urls: r.get(5)?,
                    auth_config: r.get(6)?,
                    proxy_url: r.get(7)?,
                    enabled: r.get(8)?,
                    priority: r.get(9)?,
                    last_test_ms: r.get(10)?,
                    last_test_status: r.get(11)?,
                    updated_at: r.get(12)?,
                })
            })?.filter_map(|r| r.ok()).collect();
            Ok(items)
        }).await
    }

    async fn update_source(
        &self,
        id: &str,
        name: Option<&str>,
        base_url: Option<&str>,
        proxy_url: Option<&str>,
        auth_config: Option<&str>,
        mirror_urls: Option<&str>,
        enabled: Option<i64>,
    ) -> AppResult<BookSource> {
        let sid = id.to_string();
        let n = name.map(|s| s.to_string());
        let b = base_url.map(|s| s.to_string());
        let p = proxy_url.map(|s| s.to_string());
        let a = auth_config.map(|s| s.to_string());
        let m = mirror_urls.map(|s| s.to_string());
        let now = chrono::Local::now().to_rfc3339();

        self.db.interact(move |conn| {
            if let Some(nm) = &n {
                conn.execute("UPDATE book_sources SET name = ? WHERE id = ?", params![nm, &sid])?;
            }
            if let Some(url) = &b {
                conn.execute("UPDATE book_sources SET base_url = ? WHERE id = ?", params![url, &sid])?;
            }
            if let Some(proxy) = &p {
                conn.execute("UPDATE book_sources SET proxy_url = ? WHERE id = ?", params![proxy, &sid])?;
            }
            if let Some(auth) = &a {
                conn.execute("UPDATE book_sources SET auth_config = ? WHERE id = ?", params![auth, &sid])?;
            }
            if let Some(mirrors) = &m {
                conn.execute("UPDATE book_sources SET mirror_urls = ? WHERE id = ?", params![mirrors, &sid])?;
            }
            if let Some(en) = enabled {
                conn.execute("UPDATE book_sources SET enabled = ? WHERE id = ?", params![en, &sid])?;
            }
            conn.execute("UPDATE book_sources SET updated_at = ? WHERE id = ?", params![&now, &sid])?;

            let mut stmt = conn.prepare("SELECT * FROM book_sources WHERE id = ?")?;
            let src = stmt.query_row(params![&sid], |r| {
                Ok(BookSource {
                    id: r.get(0)?,
                    source_type: r.get(1)?,
                    name: r.get(2)?,
                    description: r.get(3)?,
                    base_url: r.get(4)?,
                    mirror_urls: r.get(5)?,
                    auth_config: r.get(6)?,
                    proxy_url: r.get(7)?,
                    enabled: r.get(8)?,
                    priority: r.get(9)?,
                    last_test_ms: r.get(10)?,
                    last_test_status: r.get(11)?,
                    updated_at: r.get(12)?,
                })
            })?;
            Ok(src)
        }).await
    }

    async fn update_source_test_result(&self, id: &str, latency_ms: i64, status: &str) -> AppResult<()> {
        let sid = id.to_string();
        let st = status.to_string();
        let now = chrono::Local::now().to_rfc3339();
        self.db.interact(move |conn| {
            conn.execute(
                "UPDATE book_sources SET last_test_ms = ?, last_test_status = ?, updated_at = ? WHERE id = ?",
                params![latency_ms, &st, &now, &sid],
            )?;
            Ok(())
        }).await
    }

    async fn list_tasks(&self) -> AppResult<Vec<DownloadTask>> {
        self.db.interact(|conn| {
            let mut stmt = conn.prepare("SELECT * FROM download_tasks ORDER BY created_at DESC")?;
            let items = stmt.query_map([], |r| {
                Ok(DownloadTask {
                    id: r.get(0)?,
                    source_id: r.get(1)?,
                    source_type: r.get(2)?,
                    remote_id: r.get(3)?,
                    title: r.get(4)?,
                    author: r.get(5)?,
                    format: r.get(6)?,
                    file_size: r.get(7)?,
                    cover_url: r.get(8)?,
                    cover_color: r.get(9)?,
                    download_url: r.get(10)?,
                    status: r.get(11)?,
                    progress: r.get(12)?,
                    error_message: r.get(13)?,
                    book_id: r.get(14)?,
                    created_at: r.get(15)?,
                    updated_at: r.get(16)?,
                })
            })?.filter_map(|r| r.ok()).collect();
            Ok(items)
        }).await
    }

    async fn create_task(&self, task: &DownloadTask) -> AppResult<()> {
        let t = task.clone();
        self.db.interact(move |conn| {
            conn.execute(
                "INSERT OR REPLACE INTO download_tasks 
                 (id, source_id, source_type, remote_id, title, author, format, file_size,
                  cover_url, cover_color, download_url, status, progress, error_message, book_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    &t.id, &t.source_id, &t.source_type, &t.remote_id, &t.title, &t.author,
                    &t.format, &t.file_size, &t.cover_url, &t.cover_color, &t.download_url,
                    &t.status, t.progress, &t.error_message, &t.book_id, &t.created_at, &t.updated_at
                ],
            )?;
            Ok(())
        }).await
    }

    async fn update_task_progress(&self, id: &str, progress: i64, status: &str, error: Option<&str>) -> AppResult<()> {
        let tid = id.to_string();
        let s = status.to_string();
        let e = error.map(|x| x.to_string());
        let now = chrono::Local::now().to_rfc3339();
        self.db.interact(move |conn| {
            conn.execute(
                "UPDATE download_tasks SET progress = ?, status = ?, error_message = ?, updated_at = ? WHERE id = ?",
                params![progress, &s, &e, &now, &tid],
            )?;
            Ok(())
        }).await
    }
}
