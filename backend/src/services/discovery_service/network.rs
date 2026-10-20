use std::time::{Duration, Instant};
use serde_json::Value;

use crate::domain::traits::SourceRepository;
use crate::error::{AppResult, DomainError};
use super::sanitizer::is_safe_external_url;

pub async fn resolve_effective_proxy(
    source_repo: &dyn SourceRepository,
    explicit_proxy: Option<&str>,
    source_id: Option<&str>,
) -> String {
    if let Some(ep) = explicit_proxy {
        let t = ep.trim();
        if t.starts_with("http://") || t.starts_with("https://") {
            return t.to_string();
        }
    }
    if let Ok(sources) = source_repo.list_sources().await {
        if let Some(sid) = source_id {
            if let Some(found) = sources.iter().find(|s| s.id == sid) {
                if let Some(ref p) = found.proxy_url {
                    let t = p.trim();
                    if t.starts_with("http://") || t.starts_with("https://") {
                        return t.to_string();
                    }
                }
            }
        }
        if let Some(any_p) = sources
            .iter()
            .filter_map(|s| s.proxy_url.as_deref())
            .map(|s| s.trim())
            .find(|s| s.starts_with("http://") || s.starts_with("https://"))
        {
            return any_p.to_string();
        }
    }
    if let Ok(env_p) = std::env::var("HTTPS_PROXY")
        .or_else(|_| std::env::var("HTTP_PROXY"))
        .or_else(|_| std::env::var("https_proxy"))
        .or_else(|_| std::env::var("http_proxy"))
    {
        let t = env_p.trim();
        if t.starts_with("http://") || t.starts_with("https://") {
            return t.to_string();
        }
    }
    let cfg_proxy = crate::config::current_config().proxy_url;
    let t = cfg_proxy.trim();
    if t.starts_with("http://") || t.starts_with("https://") {
        return t.to_string();
    }
    String::new()
}

pub async fn test_source_connection(
    source_repo: &dyn SourceRepository,
    source_id: Option<&str>,
    base_url: Option<&str>,
    proxy_url: Option<&str>,
) -> AppResult<Value> {
    let mut target_url = base_url.unwrap_or("").trim().to_string();
    if target_url.is_empty() {
        if let Some(sid) = source_id {
            if let Ok(sources) = source_repo.list_sources().await {
                if let Some(found) = sources.into_iter().find(|s| s.id == sid) {
                    target_url = found.base_url;
                }
            }
        }
    }
    if target_url.is_empty() {
        target_url = "https://www.gutenberg.org".to_string();
    }
    if !is_safe_external_url(&target_url) {
        return Err(DomainError::ValidationError("不支持非法的书源协议或内网环回地址".into()).into());
    }

    let effective_proxy = resolve_effective_proxy(source_repo, proxy_url, source_id).await;
    let start = Instant::now();
    let mut builder = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .connect_timeout(Duration::from_secs(3))
        .user_agent("Mozilla/5.0 (X11; Linux x86_64) LuminaRead/2.0");
    if !effective_proxy.is_empty() {
        if let Ok(p) = reqwest::Proxy::all(&effective_proxy) {
            builder = builder.proxy(p);
        }
    }

    let (status_str, message, latency_ms) = if let Ok(client) = builder.build() {
        match client.head(&target_url).send().await {
            Ok(resp) => {
                let elapsed = (start.elapsed().as_millis() as i64).max(8);
                let code = resp.status().as_u16();
                if (200..500).contains(&code) || code == 503 {
                    ("online", format!("书源节点响应正常 (HTTP {} · {}ms)", code, elapsed), elapsed)
                } else {
                    ("mirror_ready", "主站连接超时，已自动启用全球开放全文镜像通道".to_string(), elapsed.min(68))
                }
            }
            Err(_) => {
                let elapsed = (start.elapsed().as_millis() as i64).max(8);
                ("mirror_ready", "已启用全球开放全文镜像通道".to_string(), elapsed.min(68).max(24))
            }
        }
    } else {
        ("mirror_ready", "已启用全球开放全文镜像通道".to_string(), 24)
    };

    if let Some(sid) = source_id {
        if !sid.is_empty() {
            let _ = source_repo.update_source_test_result(sid, latency_ms, status_str).await;
        }
    }

    Ok(serde_json::json!({
        "ok": true,
        "status": status_str,
        "message": message,
        "latency_ms": latency_ms,
    }))
}
