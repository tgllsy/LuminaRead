use serde_json::Value;

use crate::domain::entities::conversation::AiConversation;
use crate::domain::traits::{BookRepository, ConversationRepository};
use crate::error::AppResult;
use crate::infra::db::DbContext;
use crate::services::traits::CopilotRequestDto;

use super::llm_client::{build_text_specific_analysis, call_real_llm_copilot};
use super::recap::handle_spoiler_free_recap;
use super::translation_engine::{is_mostly_english_text, sha256_hex, translate_text_real};

struct ContextMeta {
    book_title: String,
    chapter_title: String,
    book_author: String,
    cover_color: String,
}

async fn resolve_context_meta(
    book_repo: &dyn BookRepository,
    book_id: &str,
    ch_idx: usize,
    req: &CopilotRequestDto,
) -> ContextMeta {
    let mut meta = ContextMeta {
        book_title: req.book_title.clone().unwrap_or_default(),
        chapter_title: req.chapter_title.clone().unwrap_or_default(),
        book_author: String::new(),
        cover_color: "#1e293b".to_string(),
    };

    if !book_id.is_empty() {
        if let Ok(Some(b)) = book_repo.find_by_id(book_id).await {
            if meta.book_title.trim().is_empty() {
                meta.book_title = b.title;
            }
            meta.book_author = b.author;
            meta.cover_color = b.cover_color;
        }
        if meta.chapter_title.trim().is_empty() {
            if let Ok(Some(ch_str)) = book_repo.get_raw_chapters(book_id).await {
                if let Ok(chs) = serde_json::from_str::<Vec<Value>>(&ch_str) {
                    if let Some(ch) = chs.get(ch_idx).or_else(|| chs.first()) {
                        meta.chapter_title = ch
                            .get("title")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                    }
                }
            }
        }
    }

    meta
}

async fn handle_book_rag(
    db: &DbContext,
    book_id: &str,
    book_title: &str,
    safe_q: &str,
) -> Value {
    let fts_query: String = safe_q
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || ('\u{4e00}'..='\u{9fff}').contains(c))
        .collect();
    let query_words: Vec<&str> = fts_query.split_whitespace().filter(|w| !w.is_empty()).collect();
    let match_expr = if query_words.is_empty() {
        let first_part: String = safe_q.chars().take(20).collect();
        format!("\"{}\"", first_part)
    } else {
        query_words.iter().take(4).map(|w| format!("\"{}\"", w)).collect::<Vec<_>>().join(" OR ")
    };

    let citations = if !book_id.is_empty() && !match_expr.is_empty() {
        let bid = book_id.to_string();
        let m_expr = match_expr;
        let fallback_kw: String = fts_query.split_whitespace().next().unwrap_or(safe_q).chars().take(16).collect();
        db.interact(move |conn| {
            let mut hits = Vec::new();
            if let Ok(mut stmt) = conn.prepare(
                "SELECT chapter_index, chapter_title, paragraph_index, content
                 FROM book_fts
                 WHERE book_id = ? AND book_fts MATCH ?
                 LIMIT 6",
            ) {
                if let Ok(rows) = stmt.query_map(rusqlite::params![&bid, &m_expr], |r| {
                    let ch_idx = r.get::<_, i64>(0)
                        .or_else(|_| r.get::<_, String>(0).map(|s| s.parse::<i64>().unwrap_or(0)))
                        .unwrap_or(0);
                    let ch_title = r.get::<_, String>(1).unwrap_or_default();
                    let p_idx = r.get::<_, i64>(2)
                        .or_else(|_| r.get::<_, String>(2).map(|s| s.parse::<i64>().unwrap_or(0)))
                        .unwrap_or(0);
                    let raw_content = r.get::<_, String>(3).unwrap_or_default();
                    let snippet: String = raw_content.chars().take(180).collect();
                    Ok(serde_json::json!({
                        "chapter_index": ch_idx,
                        "chapter_title": ch_title,
                        "paragraph_index": p_idx,
                        "snippet": snippet,
                    }))
                }) {
                    for hit in rows.flatten() {
                        hits.push(hit);
                    }
                }
            }
            if hits.is_empty() {
                if let Ok(mut stmt) = conn.prepare(
                    "SELECT chapter_index, chapter_title, paragraph_index, content
                     FROM book_paragraphs
                     WHERE book_id = ? AND content LIKE ?
                     LIMIT 4",
                ) {
                    let like_expr = format!("%{}%", fallback_kw);
                    if let Ok(rows) = stmt.query_map(rusqlite::params![&bid, &like_expr], |r| {
                        let ch_idx = r.get::<_, i64>(0).unwrap_or(0);
                        let ch_title = r.get::<_, String>(1).unwrap_or_default();
                        let p_idx = r.get::<_, i64>(2).unwrap_or(0);
                        let raw_content = r.get::<_, String>(3).unwrap_or_default();
                        let snippet: String = raw_content.chars().take(180).collect();
                        Ok(serde_json::json!({
                            "chapter_index": ch_idx,
                            "chapter_title": ch_title,
                            "paragraph_index": p_idx,
                            "snippet": snippet,
                        }))
                    }) {
                        for hit in rows.flatten() {
                            hits.push(hit);
                        }
                    }
                }
            }
            Ok(hits)
        }).await.unwrap_or_default()
    } else {
        Vec::new()
    };

    let hits_count = citations.len();
    let rag_answer = format!(
        "根据《{}》全文知识库精确检索，共匹配到 {} 处最相关段落。\n\n{}",
        book_title,
        hits_count,
        if hits_count == 0 {
            "（未在全书直接命中高相似度段落，基于图书主题进行宏观推演）"
        } else {
            "已锁定关键论述与人物行动，详见下方引述卡片。"
        }
    );

    serde_json::json!({
        "ok": true,
        "mode": "book_rag",
        "title": format!("《{}》全书知识库检索解答", book_title),
        "engine": "Lumina Book RAG (SQLite FTS5 Trigram Engine)",
        "citations": citations,
        "content": rag_answer,
        "follow_ups": [
            "梳理书中这一线索的前因后果",
            "分析该人物在全书中的核心作用",
            "提炼全书关于此话题的核心论点"
        ]
    })
}

async fn handle_bilingual(
    db: &DbContext,
    selected: &str,
    book_title: &str,
    chapter_title: &str,
) -> Value {
    let is_en = is_mostly_english_text(selected);
    let translated = translate_text_real(db, selected, Some(if is_en { "zh-CN" } else { "en" })).await;

    serde_json::json!({
        "ok": true,
        "mode": "bilingual",
        "title": "双语平行精译与语境解析",
        "engine": "Live Neural Translator",
        "bilingual_pair": {
            "original": selected,
            "translation": translated,
        },
        "content": format!(
            "### 原文与实时平行精译\n> **原文**：{}\n>\n> **译文**：{}\n\n### 语言转换说明\n- **源语言识别**：{}\n- **出处上下文**：《{}》· {}",
            selected,
            translated,
            if is_en { "英文 (English) → 简体中文" } else { "中文 → 英文 (English)" },
            if book_title.is_empty() { "当前书籍" } else { book_title },
            if chapter_title.is_empty() { "当前章节" } else { chapter_title },
        ),
        "follow_ups": [
            "开启本章全局双语平行对照",
            "将双语对照加入划线笔记"
        ],
    })
}

async fn handle_llm_mode(
    db: &DbContext,
    meta: &ContextMeta,
    selected: &str,
    mode: &str,
    question: &str,
    req: &CopilotRequestDto,
) -> Value {
    let history_digest = req
        .history
        .as_ref()
        .map(|h| {
            h.iter()
                .map(|item| format!("{}:{}", item.role, item.content.trim()))
                .collect::<Vec<_>>()
                .join("||")
        })
        .unwrap_or_default();

    let cache_key = sha256_hex(&format!(
        "{}|{}|{}|{}|{}|{}",
        mode, meta.book_title, meta.chapter_title, selected, question, history_digest
    ));

    let cached_resp = db
        .interact({
            let ck = cache_key.clone();
            move |conn| {
                Ok(conn
                    .query_row(
                        "SELECT response_json FROM ai_copilot_cache WHERE cache_key = ?",
                        rusqlite::params![ck],
                        |r| r.get::<_, String>(0),
                    )
                    .ok())
            }
        })
        .await
        .ok()
        .flatten();

    if let Some(json_str) = cached_resp {
        if let Ok(mut parsed) = serde_json::from_str::<Value>(&json_str) {
            if let Some(obj) = parsed.as_object_mut() {
                obj.insert("ok".to_string(), Value::Bool(true));
            }
            return parsed;
        }
    }

    let llm_res = call_real_llm_copilot(
        &meta.book_title,
        &meta.chapter_title,
        selected,
        mode,
        question,
        req.history.as_deref(),
    )
    .await;

    if let Some(res) = llm_res {
        if let Ok(serialized) = serde_json::to_string(&res) {
            let ck_save = cache_key;
            let mode_save = mode.to_string();
            let now_save = chrono::Local::now().to_rfc3339();
            let _ = db.interact(move |conn| {
                let _ = conn.execute(
                    "INSERT OR REPLACE INTO ai_copilot_cache (cache_key, mode, response_json, created_at) VALUES (?, ?, ?, ?)",
                    rusqlite::params![ck_save, mode_save, serialized, now_save],
                );
                Ok(())
            }).await;
        }
        res
    } else {
        build_text_specific_analysis(&meta.book_title, &meta.chapter_title, selected, mode, question)
    }
}

pub async fn execute_copilot(
    db: &DbContext,
    book_repo: &dyn BookRepository,
    conv_repo: &dyn ConversationRepository,
    req: CopilotRequestDto,
) -> AppResult<Value> {
    let mode = if req.mode.trim().is_empty() {
        "explain"
    } else {
        req.mode.trim()
    };

    let ch_idx = req.current_chapter_index.or(req.chapter_index).unwrap_or(0);
    let book_id = req.book_id.clone().unwrap_or_default();

    if mode == "spoiler_free_recap" || mode == "recap" {
        return handle_spoiler_free_recap(book_repo, &book_id, ch_idx, &req).await;
    }

    let meta = resolve_context_meta(book_repo, &book_id, ch_idx, &req).await;
    let selected = req.selected_text.clone().unwrap_or_default();
    let question = req.question.clone().unwrap_or_default();

    let result_val = if mode == "book_rag" {
        let q_trimmed = question.trim();
        let safe_q = if q_trimmed.is_empty() { selected.as_str() } else { q_trimmed };
        handle_book_rag(db, &book_id, &meta.book_title, safe_q).await
    } else if mode == "bilingual" {
        handle_bilingual(db, &selected, &meta.book_title, &meta.chapter_title).await
    } else {
        handle_llm_mode(db, &meta, &selected, mode, &question, &req).await
    };

    if !req.skip_log.unwrap_or(false) && !book_id.is_empty() {
        let now = chrono::Local::now().to_rfc3339();
        let id = format!("conv_{}", chrono::Local::now().timestamp_millis());
        let title_str = result_val
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("AI 伴读解析")
            .to_string();
        let content_str = result_val
            .get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let follow_ups_str = result_val.get("follow_ups").map(|v| v.to_string());
        let conv = AiConversation {
            id,
            book_id: Some(book_id),
            book_title: meta.book_title,
            book_author: if meta.book_author.is_empty() { None } else { Some(meta.book_author) },
            cover_color: Some(meta.cover_color),
            chapter_index: ch_idx as i64,
            chapter_title: if meta.chapter_title.is_empty() { None } else { Some(meta.chapter_title) },
            paragraph_index: req.paragraph_index.unwrap_or(0) as i64,
            selected_text: Some(selected),
            mode: mode.to_string(),
            question: if question.is_empty() { title_str.clone() } else { question },
            answer_title: title_str,
            answer_content: content_str,
            engine: Some("Lumina AI Copilot".into()),
            follow_ups_json: follow_ups_str,
            is_pinned: false,
            saved_highlight_id: None,
            created_at: now.clone(),
            updated_at: now,
        };
        let _ = conv_repo.create(&conv).await;
    }

    Ok(result_val)
}
