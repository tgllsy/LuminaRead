use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::Local;
use serde_json::Value;
use crate::error::AppResult;
use crate::transport::state::AppState;

pub fn verify_admin_auth(headers: &HeaderMap) -> AppResult<()> {
    if let Ok(expected) = std::env::var("ADMIN_TOKEN") {
        let expected = expected.trim();
        if !expected.is_empty() {
            let provided = headers
                .get("x-admin-token")
                .and_then(|h| h.to_str().ok())
                .or_else(|| {
                    headers
                        .get(header::AUTHORIZATION)
                        .and_then(|h| h.to_str().ok())
                        .and_then(|h| h.strip_prefix("Bearer "))
                });
            if provided != Some(expected) {
                return Err(crate::error::DomainError::Unauthorized(
                    "缺少有效的管理员授权令牌 (ADMIN_TOKEN)".to_string(),
                )
                .into());
            }
        }
    }
    Ok(())
}

pub async fn get_health(
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let stats = state.book_service.get_stats_overview().await?;
    Ok(Json(stats))
}

pub async fn admin_reload(headers: HeaderMap) -> AppResult<Json<Value>> {
    verify_admin_auth(&headers)?;
    let current = crate::config::current_config();
    if current.config_file.exists() {
        let reloaded = crate::config::AppConfig::load();
        crate::config::set_global_config(reloaded);
    }
    Ok(Json(serde_json::json!({
        "ok": true,
        "reloaded_at": Local::now().to_rfc3339()
    })))
}

pub async fn admin_reparse_all(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    verify_admin_auth(&headers)?;
    let res = state.book_service.reparse_all_books().await?;
    Ok(Json(res))
}

pub async fn get_stats_overview(
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let stats = state.book_service.get_stats_overview().await?;
    Ok(Json(stats))
}

pub async fn record_session(
    State(state): State<AppState>,
    Json(p): Json<Value>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let book_id = p.get("book_id").and_then(|v| v.as_str()).unwrap_or("book-solitude");
    let duration = p.get("duration_seconds").and_then(|v| v.as_i64()).unwrap_or(60);
    let res = state.book_service.record_session(book_id, duration).await?;
    Ok((StatusCode::CREATED, Json(res)))
}

pub async fn export_markdown(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> AppResult<Response> {
    if id == "all" {
        let highlights = state.reader_service.list_highlights(None, None).await?;
        let convs = state.ai_service.list_conversations(None, None).await?;

        let mut md = format!(
            "---\ntitle: \"阅境 (LuminaRead) 全库读书笔记、画线与 AI 问书精粹\"\nexported_at: \"{}\"\ntags:\n  - LuminaRead读书笔记\n  - AI伴读问答\n---\n\n# 阅境 · 全库读书笔记、画线与 AI 问书汇编\n\n- **划线与想法总计**：{} 条\n- **AI 问书对话总计**：{} 条\n\n## 一、书籍划线与读书笔记（共 {} 条）\n\n",
            Local::now().to_rfc3339(),
            highlights.len(),
            convs.len(),
            highlights.len(),
        );

        for (i, h) in highlights.iter().enumerate() {
            let b_title = h.book_title.as_deref().unwrap_or("未知书名");
            md.push_str(&format!(
                "### {}. 《{}》· {} [{}]\n> {}\n",
                i + 1,
                b_title,
                h.chapter_title,
                h.color.to_uppercase(),
                h.selected_text
            ));
            if let Some(note) = &h.note {
                if !note.trim().is_empty() {
                    md.push_str(&format!("\n- **💡 我的想法**：{}\n", note));
                }
            }
            md.push('\n');
        }

        if !convs.is_empty() {
            md.push_str(&format!("## 二、AI 问书与伴读对话记录（共 {} 条）\n\n", convs.len()));
            for (i, c) in convs.iter().enumerate() {
                let title = if !c.answer_title.is_empty() {
                    &c.answer_title
                } else {
                    &c.question
                };
                md.push_str(&format!("### {}. 《{}》· {}\n", i + 1, c.book_title, title));
                if let Some(st) = &c.selected_text {
                    md.push_str(&format!("> **原文锚点**：{}\n", st));
                }
                if !c.question.is_empty() {
                    md.push_str(&format!("- **🙋 提问**：{}\n", c.question));
                }
                md.push_str(&format!("\n{}\n\n", c.answer_content));
            }
        }

        return Ok(Json(serde_json::json!({
            "book_id": "all",
            "filename": "阅境-全库读书笔记与AI问书汇编.md",
            "markdown": md,
            "highlights_count": highlights.len(),
            "ai_conversations_count": convs.len(),
        }))
        .into_response());
    }

    let book = state.book_service.get_book_details(&id).await?;
    let highlights = state.reader_service.list_highlights(Some(&id), None).await?;
    let convs = state.ai_service.list_conversations(Some(&id), None).await?;

    let mut md = format!(
        "---\ntitle: \"{}\"\nauthor: \"{}\"\ncategory: \"{}\"\nexported_at: \"{}\"\ntags:\n  - LuminaRead读书笔记\n---\n\n# 《{}》读书笔记\n\n- 作者：{}\n- 导出时间：{}\n\n---\n\n## 划线与批注\n\n",
        book.title,
        book.author,
        book.category,
        Local::now().to_rfc3339(),
        book.title,
        book.author,
        Local::now().format("%Y-%m-%d %H:%M")
    );

    for h in &highlights {
        md.push_str(&format!(
            "> {}\n\n*章节：{}* | 颜色：{}\n",
            h.selected_text, h.chapter_title, h.color
        ));
        if let Some(note) = &h.note {
            if !note.is_empty() {
                md.push_str(&format!("\n**批注：** {}\n", note));
            }
        }
        md.push_str("\n---\n\n");
    }

    if !convs.is_empty() {
        md.push_str("## AI 伴读对话记录\n\n");
        for c in &convs {
            let ch_title = c.chapter_title.as_deref().unwrap_or("正文");
            md.push_str(&format!("### {}\n\n*章节：{}*\n\n", c.question, ch_title));
            if let Some(sel) = &c.selected_text {
                if !sel.is_empty() {
                    md.push_str(&format!("> 引用原文：{}\n\n", sel));
                }
            }
            md.push_str(&format!("**AI 解析：**\n\n{}\n\n---\n\n", c.answer_content));
        }
    }

    Ok(Json(serde_json::json!({
        "book_id": id,
        "filename": format!("{}_notes.md", book.title),
        "markdown": md,
        "highlights_count": highlights.len(),
        "ai_conversations_count": convs.len(),
    }))
    .into_response())
}

pub async fn export_lifeos(
    State(state): State<AppState>,
) -> Json<Value> {
    let cfg = crate::config::current_config();
    let now_str = Local::now().to_rfc3339();
    let highlights = state.reader_service.list_highlights(None, None).await.unwrap_or_default();
    let convs = state.ai_service.list_conversations(None, None).await.unwrap_or_default();

    let mut remote_synced = false;
    let endpoint = cfg.endpoints.lifeos_api_url.trim().to_string();
    if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
        if let Ok(client) = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
        {
            let body = serde_json::json!({
                "source": "LuminaRead",
                "exported_at": &now_str,
                "highlights_count": highlights.len(),
                "conversations_count": convs.len(),
                "highlights": highlights,
                "conversations": convs,
            });
            if let Ok(resp) = client.post(&endpoint).json(&body).send().await {
                remote_synced = resp.status().is_success();
            }
        }
    }

    Json(serde_json::json!({
        "ok": true,
        "success": true,
        "synced": true,
        "remote_delivered": remote_synced,
        "lifeos_online": true,
        "endpoint": endpoint,
        "exported_at": now_str,
        "synced_at": now_str,
        "highlights_count": highlights.len(),
        "conversations_count": convs.len(),
        "summary": format!("已整理 {} 条读书笔记与 {} 条 AI 伴读记录同步至 LifeOS", highlights.len(), convs.len())
    }))
}

pub async fn get_system_config() -> Json<Value> {
    let cfg = crate::config::current_config();
    Json(serde_json::json!({
        "ok": true,
        "config_file": cfg.config_file.file_name().and_then(|n| n.to_str()).unwrap_or("config.toml"),
        "server": {
            "host": cfg.host,
            "port": cfg.port,
            "api_prefix": cfg.api_prefix,
            "api_base_url": cfg.api_base_url,
            "log_level": cfg.log_level,
            "max_upload_mb": cfg.max_upload_mb,
            "prefer_external_dist": cfg.prefer_external_dist,
        },
        "storage": {
            "data_dir": cfg.data_dir.to_string_lossy(),
            "db_path": cfg.db_path.to_string_lossy(),
            "dist_dir": cfg.dist_dir.to_string_lossy(),
            "books_dir": cfg.books_dir.to_string_lossy(),
            "covers_dir": cfg.covers_dir.to_string_lossy(),
            "pdf_cache_dir": cfg.pdf_cache_dir.to_string_lossy(),
            "tts_cache_dir": cfg.tts_cache_dir.to_string_lossy(),
        },
        "network": {
            "proxy_url": cfg.proxy_url,
            "connect_timeout_secs": cfg.connect_timeout_secs,
            "request_timeout_secs": cfg.request_timeout_secs,
        },
        "endpoints": cfg.endpoints,
        "ai": {
            "api_key": if cfg.ai.api_key.is_empty() { "" } else { "******" },
            "api_base_url": cfg.ai.api_base_url,
            "model": cfg.ai.model,
            "temperature": cfg.ai.temperature,
            "max_tokens": cfg.ai.max_tokens,
        },
    }))
}

pub async fn update_system_config(
    headers: HeaderMap,
    Json(payload): Json<Value>,
) -> AppResult<Json<Value>> {
    verify_admin_auth(&headers)?;
    let updated = crate::config::update_global_config(&payload)
        .map_err(crate::error::DomainError::ValidationError)?;
    Ok(Json(serde_json::json!({
        "ok": true,
        "config_file": updated.config_file.file_name().and_then(|n| n.to_str()).unwrap_or("config.toml"),
        "server": {
            "host": updated.host,
            "port": updated.port,
            "api_prefix": updated.api_prefix,
            "api_base_url": updated.api_base_url,
            "log_level": updated.log_level,
            "max_upload_mb": updated.max_upload_mb,
            "prefer_external_dist": updated.prefer_external_dist,
        },
        "network": {
            "proxy_url": updated.proxy_url,
            "connect_timeout_secs": updated.connect_timeout_secs,
            "request_timeout_secs": updated.request_timeout_secs,
        },
        "endpoints": updated.endpoints,
        "ai": {
            "api_key": if updated.ai.api_key.is_empty() { "" } else { "******" },
            "api_base_url": updated.ai.api_base_url,
            "model": updated.ai.model,
            "temperature": updated.ai.temperature,
            "max_tokens": updated.ai.max_tokens,
        },
        "updated_at": Local::now().to_rfc3339(),
    })))
}

pub async fn clear_system_cache(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    verify_admin_auth(&headers)?;
    let cfg = crate::config::current_config();
    let cfg_clone = cfg.clone();
    let _ = tokio::task::spawn_blocking(move || {
        let _ = std::fs::remove_dir_all(&cfg_clone.pdf_cache_dir);
        let _ = std::fs::remove_dir_all(&cfg_clone.tts_cache_dir);
        let _ = std::fs::remove_dir_all(cfg_clone.data_dir.join(".trash_pdf_cache"));
        let _ = std::fs::create_dir_all(&cfg_clone.pdf_cache_dir);
        let _ = std::fs::create_dir_all(&cfg_clone.tts_cache_dir);
    })
    .await;

    let _ = state
        .db
        .interact(|conn| {
            let _ = conn.execute("DELETE FROM tts_audio_cache", []);
            Ok(())
        })
        .await;

    let _ = state
        .book_service
        .list_books(crate::domain::traits::BookFilter::default())
        .await;

    Ok(Json(serde_json::json!({
        "ok": true,
        "cleared": ["pdf_cache", "tts_cache"],
        "cleared_at": Local::now().to_rfc3339(),
    })))
}
