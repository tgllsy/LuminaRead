use rusqlite::Connection;

pub fn init_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS reading_libraries (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT NOT NULL DEFAULT '📚',
          color TEXT NOT NULL DEFAULT '#2563eb',
          description TEXT DEFAULT '',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT NOT NULL DEFAULT '未知作者',
          cover_url TEXT DEFAULT '',
          cover_color TEXT DEFAULT '#1e293b',
          isbn TEXT DEFAULT '',
          publisher TEXT DEFAULT '',
          publish_year TEXT DEFAULT '',
          source_type TEXT NOT NULL DEFAULT 'local',
          format TEXT NOT NULL DEFAULT 'epub',
          file_path TEXT DEFAULT '',
          file_size INTEGER DEFAULT 0,
          word_count INTEGER DEFAULT 0,
          category TEXT DEFAULT '精选馆藏',
          library_id TEXT DEFAULT '',
          tags TEXT DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'unread',
          import_progress INTEGER DEFAULT 100,
          import_step TEXT DEFAULT '',
          import_error TEXT DEFAULT '',
          total_reading_seconds INTEGER DEFAULT 0,
          last_read_at TEXT DEFAULT '',
          description TEXT DEFAULT '',
          chapters_json TEXT NOT NULL DEFAULT '[]',
          character_graph_json TEXT DEFAULT '[]',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS book_paragraphs (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          book_title TEXT NOT NULL,
          book_author TEXT NOT NULL,
          cover_color TEXT NOT NULL DEFAULT '#1e293b',
          chapter_index INTEGER NOT NULL,
          chapter_title TEXT NOT NULL,
          paragraph_index INTEGER NOT NULL,
          char_offset INTEGER NOT NULL DEFAULT 0,
          content TEXT NOT NULL
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS book_fts USING fts5(
          paragraph_id UNINDEXED,
          book_id,
          chapter_index UNINDEXED,
          paragraph_index UNINDEXED,
          book_title,
          chapter_title,
          content,
          tokenize = 'trigram'
        );

        CREATE TABLE IF NOT EXISTS reading_progress (
          book_id TEXT PRIMARY KEY,
          chapter_index INTEGER NOT NULL DEFAULT 0,
          scroll_offset REAL NOT NULL DEFAULT 0,
          cfi TEXT DEFAULT '',
          percentage REAL NOT NULL DEFAULT 0,
          device_name TEXT DEFAULT '',
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS highlights (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          chapter_index INTEGER NOT NULL,
          chapter_title TEXT NOT NULL DEFAULT '',
          selected_text TEXT NOT NULL,
          paragraph_index INTEGER NOT NULL DEFAULT 0,
          start_offset INTEGER NOT NULL DEFAULT 0,
          end_offset INTEGER NOT NULL DEFAULT 0,
          cfi_range TEXT DEFAULT '',
          style_type TEXT NOT NULL DEFAULT 'highlight',
          color TEXT NOT NULL DEFAULT 'yellow',
          note TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          chapter_index INTEGER NOT NULL,
          chapter_title TEXT NOT NULL DEFAULT '',
          snippet TEXT DEFAULT '',
          percentage REAL NOT NULL DEFAULT 0,
          scroll_offset REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS book_sources (
          id TEXT PRIMARY KEY,
          source_type TEXT NOT NULL DEFAULT 'opds',
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          base_url TEXT NOT NULL,
          mirror_urls TEXT DEFAULT '[]',
          auth_config TEXT DEFAULT '{}',
          proxy_url TEXT DEFAULT '',
          enabled INTEGER NOT NULL DEFAULT 1,
          priority INTEGER NOT NULL DEFAULT 10,
          last_test_ms INTEGER NOT NULL DEFAULT 0,
          last_test_status TEXT DEFAULT 'ready',
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS download_tasks (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL,
          source_type TEXT NOT NULL DEFAULT 'opds',
          remote_id TEXT DEFAULT '',
          title TEXT NOT NULL,
          author TEXT DEFAULT '',
          format TEXT DEFAULT 'epub',
          file_size TEXT DEFAULT '',
          cover_url TEXT DEFAULT '',
          cover_color TEXT DEFAULT '#1e293b',
          download_url TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending',
          progress INTEGER NOT NULL DEFAULT 0,
          error_message TEXT DEFAULT '',
          book_id TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ai_conversations (
          id TEXT PRIMARY KEY,
          book_id TEXT DEFAULT '',
          book_title TEXT NOT NULL DEFAULT '',
          book_author TEXT DEFAULT '',
          cover_color TEXT DEFAULT '#1e293b',
          chapter_index INTEGER NOT NULL DEFAULT 0,
          chapter_title TEXT DEFAULT '',
          paragraph_index INTEGER NOT NULL DEFAULT 0,
          selected_text TEXT DEFAULT '',
          mode TEXT NOT NULL DEFAULT 'explain',
          question TEXT NOT NULL,
          answer_title TEXT NOT NULL,
          answer_content TEXT NOT NULL,
          engine TEXT DEFAULT 'Built-in Lumina AI',
          follow_ups_json TEXT DEFAULT '[]',
          is_pinned INTEGER NOT NULL DEFAULT 0,
          saved_highlight_id TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS translation_cache (
          source_hash TEXT PRIMARY KEY,
          source_text TEXT NOT NULL,
          target_lang TEXT NOT NULL,
          translated_text TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ai_copilot_cache (
          cache_key TEXT PRIMARY KEY,
          mode TEXT NOT NULL,
          response_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tts_providers_config (
          id TEXT PRIMARY KEY,
          config_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tts_audio_cache (
          cache_key TEXT PRIMARY KEY,
          voice TEXT NOT NULL,
          rate TEXT NOT NULL DEFAULT '+0%',
          pitch TEXT NOT NULL DEFAULT '+0Hz',
          text_hash TEXT NOT NULL,
          text_preview TEXT DEFAULT '',
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          engine TEXT NOT NULL DEFAULT 'edge-neural',
          hit_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          last_accessed_at TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_tts_last_accessed
          ON tts_audio_cache(last_accessed_at ASC);

        CREATE TABLE IF NOT EXISTS reading_sessions (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          duration_seconds INTEGER NOT NULL,
          pages_read INTEGER NOT NULL DEFAULT 0,
          start_time TEXT NOT NULL DEFAULT '',
          end_time TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_books_library_id ON books(library_id);
        CREATE INDEX IF NOT EXISTS idx_highlights_book ON highlights(book_id);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_book ON bookmarks(book_id);
        CREATE INDEX IF NOT EXISTS idx_paragraphs_book ON book_paragraphs(book_id);
        CREATE INDEX IF NOT EXISTS idx_paragraphs_book_ch ON book_paragraphs(book_id, chapter_index, paragraph_index);
        "
    )?;

    let _ = conn.execute("ALTER TABLE books ADD COLUMN library_id TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE books ADD COLUMN import_progress INTEGER DEFAULT 100", []);
    let _ = conn.execute("ALTER TABLE books ADD COLUMN import_step TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE books ADD COLUMN import_error TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE books ADD COLUMN chapters_count INTEGER DEFAULT 0", []);
    let _ = conn.execute(
        "UPDATE books SET chapters_count = COALESCE(json_array_length(chapters_json), 0)
         WHERE (chapters_count IS NULL OR chapters_count = 0) AND chapters_json != '[]'",
        [],
    );
    let _ = conn.execute(
        "UPDATE books SET status = 'failed', import_step = '导入中断',
         import_error = CASE WHEN import_error = '' THEN '服务重启或上传意外中断，请删除后重新导入' ELSE import_error END
         WHERE status = 'importing'",
        [],
    );
    let _ = conn.execute("ALTER TABLE reading_sessions ADD COLUMN session_date TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE reading_sessions ADD COLUMN words_read INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE reading_sessions ADD COLUMN created_at TEXT DEFAULT ''", []);

    let _ = conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
         CREATE INDEX IF NOT EXISTS idx_sessions_book_date ON reading_sessions(book_id, session_date);
         CREATE INDEX IF NOT EXISTS idx_sessions_date ON reading_sessions(session_date);
         CREATE INDEX IF NOT EXISTS idx_highlights_created ON highlights(created_at DESC);
         CREATE INDEX IF NOT EXISTS idx_download_tasks_status ON download_tasks(status);
         CREATE INDEX IF NOT EXISTS idx_ai_conversations_book ON ai_conversations(book_id, created_at DESC);
         CREATE INDEX IF NOT EXISTS idx_tts_cache_hash_voice ON tts_audio_cache(text_hash, voice);",
    );

    seed_defaults(conn)?;
    ensure_fts_populated(conn)?;

    Ok(())
}

fn seed_defaults(conn: &Connection) -> rusqlite::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();

    let lib_cnt: i64 = conn.query_row("SELECT COUNT(*) FROM reading_libraries", [], |r| r.get(0)).unwrap_or(0);
    if lib_cnt == 0 {
        let default_libs = [
            ("lib-default", "全部馆藏", "📚", "#2563eb", "系统默认全量书籍馆藏", 0),
            ("lib-tech", "技术架构与工程", "⚡", "#0f766e", "系统架构、编程语言与底层原理精选", 10),
            ("lib-literature", "经典文学与小说", "☕", "#7c2d12", "世界名著、科幻奇幻与现当代文学经典", 20),
            ("lib-history", "历史哲学与社科", "🏛️", "#4c1d95", "历史演进、哲学思辨与经济社科经典", 30),
        ];
        for (id, name, icon, color, desc, sort) in default_libs {
            let _ = conn.execute(
                "INSERT INTO reading_libraries (id, name, icon, color, description, sort_order, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                rusqlite::params![id, name, icon, color, desc, sort, &now],
            );
        }
    }

    let cfg = crate::config::current_config();
    let src_cnt: i64 = conn.query_row("SELECT COUNT(*) FROM book_sources", [], |r| r.get(0)).unwrap_or(0);
    if src_cnt < 7 {
        let default_sources = [
            ("zlib-official", "zlibrary", "Z-Library 全球数字图书馆 (Z-Lib 专属引擎)", "支持配置个人 Z-Library 专属域名、Remix 认证 Token 或镜像节点，检索全球馆藏。", cfg.endpoints.zlib_url.as_str(), 10),
            ("annas-archive", "annas_archive", "Anna's Archive 安娜的档案 (Z-Lib + LibGen 全量索引)", "全球最大开源影子图书馆聚合索引，支持标题、作者、ISBN 与 MD5 检索。", cfg.endpoints.annas_archive_url.as_str(), 20),
            ("gutenberg-direct", "gutenberg", "Project Gutenberg 全球公版书直连 (Gutendex 免配置)", "无需账号即可实时搜索并直接下载 70,000+ 本高质量 EPUB/TXT 公版图书。", cfg.endpoints.gutenberg_url.as_str(), 30),
            ("openlibrary-direct", "openlibrary", "OpenLibrary & Internet Archive 开放书库", "互联网档案馆开放图书检索引擎，支持数百万册全球出版物元数据与公版全文下载。", cfg.endpoints.openlibrary_url.as_str(), 40),
            ("standard-opds", "opds", "Standard Ebooks / 自定义 OPDS 书源通道", "兼容 Calibre-Web、Komga、Kavita 及 Standard Ebooks 等标准 OPDS 1.2 订阅源。", cfg.endpoints.standard_opds_url.as_str(), 50),
            ("archive-direct", "openlibrary", "Internet Archive 全球数字档案馆 (直连检索)", "直连 Archive.org 数字文献馆藏，支持多语种扫描本与 EPUB/PDF 全文获取。", cfg.endpoints.archive_org_url.as_str(), 60),
            ("calibre-opds", "opds", "Calibre-Web / 私有 OPDS 书库订阅", "支持接入自建 Calibre-Web、Komga 或局域网 OPDS 目录服务。", cfg.endpoints.calibre_opds_url.as_str(), 70),
        ];
        for (id, stype, name, desc, url, prio) in default_sources {
            let _ = conn.execute(
                "INSERT OR IGNORE INTO book_sources (id, source_type, name, description, base_url, mirror_urls, auth_config, proxy_url, enabled, priority, last_test_ms, last_test_status, updated_at)
                 VALUES (?, ?, ?, ?, ?, '[]', '{}', '', 1, ?, 0, 'ready', ?)",
                rusqlite::params![id, stype, name, desc, url, prio, &now],
            );
        }
    }

    // Clean up orphaned pdf_cache folders that do not belong to any book in DB
    if let Ok(entries) = std::fs::read_dir(&cfg.pdf_cache_dir) {
        let mut valid_ids = std::collections::HashSet::new();
        if let Ok(mut stmt) = conn.prepare("SELECT id FROM books") {
            if let Ok(rows) = stmt.query_map([], |r| r.get::<_, String>(0)) {
                for id in rows.flatten() {
                    valid_ids.insert(id);
                }
            }
        }
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                    if !valid_ids.contains(name) {
                        let _ = std::fs::remove_dir_all(&p);
                    }
                }
            }
        }
    }

    Ok(())
}

fn ensure_fts_populated(conn: &Connection) -> rusqlite::Result<()> {
    // Check if book_fts uses trigram, has chapter_title, and indexes book_id (not UNINDEXED)
    let fts_sql: String = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='book_fts'",
            [],
            |r| r.get(0),
        )
        .unwrap_or_default();

    let fts_lower = fts_sql.to_lowercase();
    let needs_recreate = !fts_lower.contains("trigram")
        || !fts_sql.contains("chapter_title")
        || fts_lower.contains("book_id unindexed");
    if needs_recreate {
        let _ = conn.execute_batch(
            "DROP TABLE IF EXISTS book_fts;
             CREATE VIRTUAL TABLE book_fts USING fts5(
               paragraph_id UNINDEXED,
               book_id,
               chapter_index UNINDEXED,
               paragraph_index UNINDEXED,
               book_title,
               chapter_title,
               content,
               tokenize = 'trigram'
             );",
        );
    }

    let para_cnt: i64 = conn.query_row("SELECT COUNT(*) FROM book_paragraphs", [], |r| r.get(0)).unwrap_or(0);
    if para_cnt == 0 {
        let mut stmt = conn.prepare("SELECT id, title, author, cover_color, chapters_json FROM books WHERE chapters_json != '[]'")?;
        let books: Vec<(String, String, String, String, String)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "#1e293b".to_string()),
                    row.get(4)?,
                ))
            })?
            .filter_map(|r| r.ok())
            .collect();

        if !books.is_empty() {
            let tx = conn.unchecked_transaction()?;
            {
                let mut ins_para = tx.prepare(
                    "INSERT INTO book_paragraphs (id, book_id, book_title, book_author, cover_color,
                     chapter_index, chapter_title, paragraph_index, char_offset, content)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                )?;
                let mut ins_fts = tx.prepare(
                    "INSERT INTO book_fts (paragraph_id, book_id, chapter_index, paragraph_index,
                     book_title, chapter_title, content)
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                )?;
                for (id, title, author, cover_color, chapters_json) in books {
                    if let Ok(chapters) = serde_json::from_str::<Vec<serde_json::Value>>(&chapters_json) {
                        for (ch_idx, ch) in chapters.iter().enumerate() {
                            let ch_title = ch.get("title").and_then(|v| v.as_str()).unwrap_or("未命名章节");
                            let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
                            let mut running_offset: i64 = 0;
                            for (p_idx, para_text) in content.split('\n').map(|p| p.trim()).filter(|p| !p.is_empty()).enumerate() {
                                let para_id = format!("{}_c{}_p{}", id, ch_idx, p_idx);
                                let _ = ins_para.execute(rusqlite::params![
                                    &para_id, &id, &title, &author, &cover_color,
                                    ch_idx as i64, ch_title, p_idx as i64, running_offset, para_text
                                ]);
                                let _ = ins_fts.execute(rusqlite::params![
                                    &para_id, &id, ch_idx.to_string(), p_idx.to_string(),
                                    &title, ch_title, para_text
                                ]);
                                running_offset += (para_text.chars().count() as i64) + 2;
                            }
                        }
                    }
                }
            }
            tx.commit()?;
        }
    } else {
        let fts_cnt: i64 = conn.query_row("SELECT COUNT(*) FROM book_fts", [], |r| r.get(0)).unwrap_or(0);
        if fts_cnt == 0 {
            let _ = conn.execute(
                "INSERT INTO book_fts (paragraph_id, book_id, chapter_index, paragraph_index, book_title, chapter_title, content)
                 SELECT id, book_id, CAST(chapter_index AS TEXT), CAST(paragraph_index AS TEXT), book_title, chapter_title, content
                 FROM book_paragraphs",
                [],
            );
        }
    }

    // Self-healing migration: reset erroneously marked 'finished' status for books where progress < 95%
    let _ = conn.execute(
        "UPDATE books
         SET status = 'reading'
         WHERE status = 'finished'
           AND id IN (
             SELECT book_id FROM reading_progress WHERE percentage < 95.0
           )",
        [],
    );

    Ok(())
}
