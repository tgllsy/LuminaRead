use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use tokio::sync::Semaphore;
use tokio::task;
use crate::error::{AppResult, InfraError};

fn open_connection(path: &Path) -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(path)?;
    conn.busy_timeout(std::time::Duration::from_millis(15000))?;
    conn.execute_batch(
        "PRAGMA busy_timeout = 15000;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA cache_size = -64000;",
    )?;
    Ok(conn)
}

#[derive(Clone)]
pub struct DbContext {
    pool: Arc<Mutex<Vec<Connection>>>,
    semaphore: Arc<Semaphore>,
    pub db_path: PathBuf,
}

impl DbContext {
    pub fn new(path: &Path) -> Result<Self, rusqlite::Error> {
        let first_conn = open_connection(path)?;
        let max_conns = 16;
        Ok(Self {
            pool: Arc::new(Mutex::new(vec![first_conn])),
            semaphore: Arc::new(Semaphore::new(max_conns)),
            db_path: path.to_path_buf(),
        })
    }

    /// 核心基础设施守则：基于连接池将 SQLite 交互并行分发至 Tokio 独立阻塞线程池
    pub async fn interact<F, R>(&self, f: F) -> AppResult<R>
    where
        F: FnOnce(&mut Connection) -> Result<R, rusqlite::Error> + Send + 'static,
        R: Send + 'static,
    {
        let _permit = self
            .semaphore
            .acquire()
            .await
            .map_err(|_| InfraError::LockPoisoned)?;

        let pool = Arc::clone(&self.pool);
        let path = self.db_path.clone();

        let res = task::spawn_blocking(move || {
            let mut conn = {
                let mut guard = pool.lock().map_err(|_| InfraError::LockPoisoned)?;
                guard.pop()
            }
            .map(Ok)
            .unwrap_or_else(|| open_connection(&path))
            .map_err(InfraError::Database)?;

            let result = f(&mut conn);

            if !conn.is_autocommit() {
                let _ = conn.execute_batch("ROLLBACK;");
            }

            if let Ok(mut guard) = pool.lock() {
                guard.push(conn);
            }

            result.map_err(InfraError::Database)
        })
        .await
        .map_err(InfraError::JoinError)??;

        Ok(res)
    }
}
