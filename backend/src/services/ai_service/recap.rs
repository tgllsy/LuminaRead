use serde_json::Value;
use std::collections::HashSet;

use crate::domain::traits::BookRepository;
use crate::error::AppResult;
use crate::services::traits::CopilotRequestDto;

use super::graph::{ensure_complete_node, extract_dynamic_character_graph};

pub async fn handle_spoiler_free_recap(
    book_repo: &dyn BookRepository,
    book_id: &str,
    ch_idx: usize,
    req: &CopilotRequestDto,
) -> AppResult<Value> {
    let mut book_title = req.book_title.clone().unwrap_or_else(|| "当前书目".into());
    let mut book_author = "未知作者".to_string();
    let mut all_chapters: Vec<Value> = Vec::new();
    let mut raw_graph_str = String::new();

    if !book_id.is_empty() {
        if let Ok(Some(b)) = book_repo.find_by_id(book_id).await {
            book_title = b.title;
            book_author = b.author;
        }
        if let Ok(Some(ch_str)) = book_repo.get_raw_chapters(book_id).await {
            all_chapters = serde_json::from_str(&ch_str).unwrap_or_default();
        }
        if let Ok(Some(g_str)) = book_repo.get_character_graph(book_id).await {
            raw_graph_str = g_str;
        }
    }

    let total_chapters = all_chapters.len().max(1);
    let safe_max_idx = ch_idx.min(total_chapters.saturating_sub(1));
    let visible_chapters: Vec<Value> = if all_chapters.is_empty() {
        Vec::new()
    } else {
        all_chapters[..=safe_max_idx].to_vec()
    };
    let visible_count = visible_chapters.len().max(1);
    let hidden_count = total_chapters.saturating_sub(visible_count);
    let pct = match req.current_percentage {
        Some(p) if p > 0.0 => p.round() as i64,
        _ => (((safe_max_idx + 1) as f64 / total_chapters as f64) * 100.0).round() as i64,
    };

    let recap_points = build_recap_points(&visible_chapters);
    let (final_nodes, final_edges) = build_recap_graph(
        &raw_graph_str,
        &visible_chapters,
        &book_title,
        safe_max_idx,
        visible_count,
    );

    Ok(serde_json::json!({
        "ok": true,
        "book_id": book_id,
        "book_title": book_title,
        "author": book_author,
        "current_chapter_index": safe_max_idx,
        "total_chapters": total_chapters,
        "visible_chapters_count": visible_count,
        "hidden_chapters_count": hidden_count,
        "spoiler_lock_badge": format!(
            "严格防剧透物理隔离已启用 · 仅截取第 1 章至第 {} 章（前 {}% 已读进度），后续 {} 章未读内容已完全屏蔽",
            safe_max_idx + 1, pct, hidden_count
        ),
        "recap_points": recap_points,
        "character_graph": { "nodes": final_nodes, "edges": final_edges },
        "content": format!("截至第 {} 章的无剧透剧情提要：故事围绕核心主线展开，人物关系与危机机制正在逐步演化推进。", visible_count),
    }))
}

fn build_recap_points(visible_chapters: &[Value]) -> Vec<Value> {
    if visible_chapters.is_empty() {
        return vec![serde_json::json!({
            "chapter_index": 0,
            "chapter_title": "第一章",
            "summary": "正在展开核心叙事脉络与人物背景铺垫。",
            "key_quote": "",
        })];
    }
    visible_chapters
        .iter()
        .enumerate()
        .map(|(idx, ch)| {
            let c_title = ch
                .get("title")
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("第 {} 章", idx + 1));
            let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let paras: Vec<&str> = content
                .split('\n')
                .map(|p| p.trim())
                .filter(|p| !p.is_empty() && !p.starts_with("[[PDF_PAGE:") && !p.starts_with("[[BOOK_IMAGE:"))
                .collect();
            let first_p: String = paras.first().copied().unwrap_or("").chars().take(105).collect();
            let mid_p: String = if paras.len() > 2 {
                paras[paras.len() / 2].chars().take(80).collect()
            } else {
                String::new()
            };
            let mut summary_parts = Vec::new();
            if !first_p.is_empty() {
                summary_parts.push(first_p.clone());
            }
            if !mid_p.is_empty() && mid_p != first_p {
                summary_parts.push(mid_p);
            }
            let summary = if summary_parts.is_empty() {
                format!("{} 核心情节推进", c_title)
            } else {
                summary_parts.join(" · ")
            };
            let quote: String = paras
                .iter()
                .copied()
                .find(|p| p.chars().count() >= 25)
                .unwrap_or(first_p.as_str())
                .chars()
                .take(90)
                .collect();
            serde_json::json!({
                "chapter_index": idx,
                "chapter_title": c_title,
                "summary": summary,
                "key_quote": quote,
            })
        })
        .collect()
}

fn build_recap_graph(
    raw_graph_str: &str,
    visible_chapters: &[Value],
    book_title: &str,
    safe_max_idx: usize,
    visible_count: usize,
) -> (Vec<Value>, Vec<Value>) {
    let mut final_nodes = Vec::new();
    let mut final_edges = Vec::new();

    if !raw_graph_str.is_empty() {
        if let Ok(graph) = serde_json::from_str::<Value>(raw_graph_str) {
            if let Some(nodes) = graph.get("nodes").and_then(|v| v.as_array()) {
                let mut kept_ids = HashSet::new();
                for (idx, n) in nodes.iter().enumerate() {
                    let first_seen =
                        n.get("firstSeenChapter").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                    if first_seen <= safe_max_idx {
                        let normalized = ensure_complete_node(n, idx, visible_count);
                        if let Some(nid) = normalized.get("id").and_then(|v| v.as_str()) {
                            kept_ids.insert(nid.to_string());
                        }
                        final_nodes.push(normalized);
                    }
                }
                if let Some(edges) = graph.get("edges").and_then(|v| v.as_array()) {
                    for e in edges {
                        let src = e.get("source").and_then(|v| v.as_str()).unwrap_or("");
                        let tgt = e.get("target").and_then(|v| v.as_str()).unwrap_or("");
                        if kept_ids.contains(src) && kept_ids.contains(tgt) {
                            final_edges.push(e.clone());
                        }
                    }
                }
            }
        }
    }

    if final_nodes.is_empty() && !visible_chapters.is_empty() {
        let (dyn_nodes, dyn_edges) = extract_dynamic_character_graph(visible_chapters, book_title);
        final_nodes = dyn_nodes;
        final_edges = dyn_edges;
    }

    (final_nodes, final_edges)
}
