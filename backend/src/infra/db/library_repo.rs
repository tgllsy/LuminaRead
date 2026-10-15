use async_trait::async_trait;
use rusqlite::params;
use crate::domain::entities::library::ReadingLibrary;
use crate::domain::traits::LibraryRepository;
use crate::error::AppResult;
use crate::infra::db::pool::DbContext;

pub struct SqliteLibraryRepository {
    db: DbContext,
}

impl SqliteLibraryRepository {
    pub fn new(db: DbContext) -> Self {
        Self { db }
    }
}

#[async_trait]
impl LibraryRepository for SqliteLibraryRepository {
    async fn list(&self) -> AppResult<Vec<ReadingLibrary>> {
        self.db.interact(|conn| {
            let mut stmt = conn.prepare(
                "SELECT l.id, l.name, l.icon, l.color, l.description, l.sort_order, l.created_at,
                        (SELECT COUNT(*) FROM books b WHERE b.library_id = l.id) AS book_count
                 FROM reading_libraries l ORDER BY l.sort_order ASC, l.created_at ASC"
            )?;
            let list = stmt.query_map([], |r| {
                Ok(ReadingLibrary {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    icon: r.get(2)?,
                    color: r.get(3)?,
                    description: r.get(4)?,
                    sort_order: r.get(5)?,
                    created_at: r.get(6)?,
                    book_count: r.get(7)?,
                })
            })?.filter_map(|r| r.ok()).collect();
            Ok(list)
        }).await
    }

    async fn create(&self, lib: &ReadingLibrary) -> AppResult<()> {
        let l = lib.clone();
        self.db.interact(move |conn| {
            conn.execute(
                "INSERT INTO reading_libraries (id, name, icon, color, description, sort_order, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                params![&l.id, &l.name, &l.icon, &l.color, &l.description, l.sort_order, &l.created_at],
            )?;
            Ok(())
        }).await
    }

    async fn update(&self, id: &str, name: &str, icon: &str, color: &str, desc: Option<&str>) -> AppResult<()> {
        let lid = id.to_string();
        let n = name.to_string();
        let i = icon.to_string();
        let c = color.to_string();
        let d = desc.map(|s| s.to_string());
        self.db.interact(move |conn| {
            conn.execute(
                "UPDATE reading_libraries SET name = ?, icon = ?, color = ?, description = ? WHERE id = ?",
                params![&n, &i, &c, &d, &lid],
            )?;
            Ok(())
        }).await
    }

    async fn delete(&self, id: &str) -> AppResult<()> {
        let lid = id.to_string();
        self.db.interact(move |conn| {
            let tx = conn.transaction()?;
            tx.execute("UPDATE books SET library_id = 'lib-default' WHERE library_id = ?", params![&lid])?;
            tx.execute("DELETE FROM reading_libraries WHERE id = ?", params![&lid])?;
            tx.commit()?;
            Ok(())
        }).await
    }
}
