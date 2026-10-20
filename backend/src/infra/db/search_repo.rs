use async_trait::async_trait;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::time::Instant;
use crate::domain::traits::SearchRepository;
use crate::error::AppResult;
use crate::infra::db::pool::DbContext;

pub struct SqliteSearchRepository {
    db: DbContext,
}

impl SqliteSearchRepository {
    pub fn new(db: DbContext) -> Self {
        Self { db }
    }
}

pub fn escape_sql_like(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 4);
    for c in s.chars() {
        if c == '%' || c == '_' || c == '\\' {
            out.push('\\');
        }
        out.push(c);
    }
    out
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchHit {
    pub id: String,
    pub book_id: String,
    pub book_title: String,
    pub book_author: String,
    pub cover_color: String,
    pub chapter_index: i64,
    pub chapter_title: String,
    pub paragraph_index: i64,
    pub char_offset: i64,
    pub match_offset_in_para: usize,
    pub match_count: usize,
    pub snippet_before: String,
    pub match_text: String,
    pub snippet_after: String,
    pub full_paragraph: String,
}

struct RawParagraph {
    id: String,
    book_id: String,
    book_title: String,
    book_author: String,
    cover_color: Option<String>,
    chapter_index: i64,
    chapter_title: String,
    paragraph_index: i64,
    char_offset: i64,
    content: String,
}

impl RawParagraph {
    fn into_search_hit(
        self,
        lower_q: &str,
        terms: &[String],
        lower_terms: &[String],
    ) -> SearchHit {
        let text = &self.content;
        let char_text: Vec<char> = text.chars().collect();
        let lower_char_text: Vec<char> = char_text
            .iter()
            .map(|c| c.to_lowercase().next().unwrap_or(*c))
            .collect();

        let lq_chars: Vec<char> = lower_q.chars().collect();
        let mut char_match_pos = None;
        let mut active_term_chars = lq_chars.len();

        if !lq_chars.is_empty() && lq_chars.len() <= lower_char_text.len() {
            for i in 0..=(lower_char_text.len() - lq_chars.len()) {
                if lower_char_text[i..i + lq_chars.len()] == lq_chars[..] {
                    char_match_pos = Some(i);
                    break;
                }
            }
        }

        if char_match_pos.is_none() && terms.len() > 1 {
            let matched_title = self.book_title.to_lowercase().contains(lower_q)
                || self.chapter_title.to_lowercase().contains(lower_q);
            if !matched_title {
                for term in terms {
                    let lt_chars: Vec<char> = term
                        .chars()
                        .map(|c| c.to_lowercase().next().unwrap_or(c))
                        .collect();
                    if !lt_chars.is_empty() && lt_chars.len() <= lower_char_text.len() {
                        for i in 0..=(lower_char_text.len() - lt_chars.len()) {
                            if lower_char_text[i..i + lt_chars.len()] == lt_chars[..] {
                                char_match_pos = Some(i);
                                active_term_chars = lt_chars.len();
                                break;
                            }
                        }
                    }
                    if char_match_pos.is_some() {
                        break;
                    }
                }
            }
        }

        let mut count_in_para = 0;
        let matched_full_q = char_match_pos.is_some() && active_term_chars == lq_chars.len();
        let count_targets: Vec<Vec<char>> = if matched_full_q {
            vec![lq_chars]
        } else {
            lower_terms.iter().map(|s| s.chars().collect()).collect()
        };

        for lt in &count_targets {
            if lt.is_empty() || lt.len() > lower_char_text.len() {
                continue;
            }
            let mut i = 0;
            while i <= lower_char_text.len() - lt.len() {
                if lower_char_text[i..i + lt.len()] == lt[..] {
                    count_in_para += 1;
                    i += lt.len().max(1);
                } else {
                    i += 1;
                }
            }
        }
        if count_in_para == 0 {
            count_in_para = 1;
        }

        let (snippet_before, match_text, snippet_after) = if let Some(char_midx) = char_match_pos {
            let c_len = char_text.len();
            let c_start = char_midx.saturating_sub(24);
            let m_end = (char_midx + active_term_chars).min(c_len);
            let c_end = (m_end + 32).min(c_len);

            let before_str: String = char_text[c_start..char_midx].iter().collect();
            let match_str: String = char_text[char_midx..m_end].iter().collect();
            let after_str: String = char_text[m_end..c_end].iter().collect();

            (
                format!("{}{}", if c_start > 0 { "…" } else { "" }, before_str),
                match_str,
                format!("{}{}", after_str, if c_end < c_len { "…" } else { "" }),
            )
        } else {
            let len = char_text.len().min(48);
            let slice: String = char_text[..len].iter().collect();
            (
                format!("{}{}", slice, if char_text.len() > 48 { "…" } else { "" }),
                String::new(),
                String::new(),
            )
        };

        SearchHit {
            id: self.id,
            book_id: self.book_id,
            book_title: self.book_title,
            book_author: self.book_author,
            cover_color: self.cover_color.unwrap_or_else(|| "#1e293b".into()),
            chapter_index: self.chapter_index,
            chapter_title: self.chapter_title,
            paragraph_index: self.paragraph_index,
            char_offset: self.char_offset + (char_match_pos.unwrap_or(0) as i64),
            match_offset_in_para: char_match_pos.unwrap_or(0),
            match_count: count_in_para,
            snippet_before,
            match_text,
            snippet_after,
            full_paragraph: self.content,
        }
    }
}

fn diversify_across_books(candidates: Vec<RawParagraph>, limit: usize) -> Vec<RawParagraph> {
    if candidates.len() <= limit {
        return candidates;
    }
    let mut by_book: HashMap<String, Vec<RawParagraph>> = HashMap::new();
    let mut book_order: Vec<String> = Vec::new();
    for p in candidates {
        if !by_book.contains_key(&p.book_id) {
            book_order.push(p.book_id.clone());
        }
        by_book.entry(p.book_id.clone()).or_default().push(p);
    }
    if book_order.len() <= 1 {
        return by_book
            .into_values()
            .next()
            .unwrap_or_default()
            .into_iter()
            .take(limit)
            .collect();
    }
    // Round-robin across matched books so no single huge book monopolizes global search
    let mut indices: HashMap<String, usize> = book_order.iter().map(|b| (b.clone(), 0)).collect();
    let mut out = Vec::with_capacity(limit);
    while out.len() < limit {
        let mut added_any = false;
        for bid in &book_order {
            if out.len() >= limit {
                break;
            }
            if let Some(list) = by_book.get(bid) {
                let idx = indices.get(bid).copied().unwrap_or(0);
                if idx < list.len() {
                    let item = &list[idx];
                    out.push(RawParagraph {
                        id: item.id.clone(),
                        book_id: item.book_id.clone(),
                        book_title: item.book_title.clone(),
                        book_author: item.book_author.clone(),
                        cover_color: item.cover_color.clone(),
                        chapter_index: item.chapter_index,
                        chapter_title: item.chapter_title.clone(),
                        paragraph_index: item.paragraph_index,
                        char_offset: item.char_offset,
                        content: item.content.clone(),
                    });
                    indices.insert(bid.clone(), idx + 1);
                    added_any = true;
                }
            }
        }
        if !added_any {
            break;
        }
    }
    out
}

#[async_trait]
impl SearchRepository for SqliteSearchRepository {
    async fn search(&self, q: &str, book_id: Option<&str>, limit: usize) -> AppResult<Value> {
        let query_str = q.trim().to_string();
        let target_book = book_id.map(|s| s.to_string());
        let effective_limit = limit.clamp(1, 200);

        self.db.interact(move |conn| {
            let start = Instant::now();
            if query_str.is_empty() || (target_book.is_none() && query_str.chars().count() < 2) {
                return Ok(serde_json::json!({
                    "query": query_str,
                    "elapsed_ms": 0.0,
                    "engine": "SQLite FTS5 Trigram Inverted Index",
                    "total_matches": 0,
                    "books_matched": 0,
                    "chapter_hits": [],
                    "highlight_hits": [],
                }));
            }

            let terms: Vec<String> = query_str
                .split_whitespace()
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
                .collect();
            let lower_q = query_str.to_lowercase();
            let lower_terms: Vec<String> = terms.iter().map(|t| t.to_lowercase()).collect();
            let trigram_terms: Vec<&str> = terms
                .iter()
                .map(|s| s.as_str())
                .filter(|t| t.chars().count() >= 3)
                .collect();

            let mut chapter_hits: Vec<SearchHit> = Vec::new();
            let mut used_fts = false;

            // 1. Try FTS5 trigram search if any term has >= 3 chars
            if !trigram_terms.is_empty() {
                let fts_expr = trigram_terms
                    .iter()
                    .map(|t| format!("\"{}\"", t.replace('"', "\"\"")))
                    .collect::<Vec<_>>()
                    .join(" AND ");

                let candidate_limit = if target_book.is_some() {
                    effective_limit * 4
                } else {
                    (effective_limit * 8).max(240)
                };

                let query_sql = match &target_book {
                    Some(_) => "SELECT p.id, p.book_id, p.book_title, p.book_author, p.cover_color,
                                       p.chapter_index, p.chapter_title, p.paragraph_index, p.char_offset, p.content
                                FROM book_fts f
                                JOIN book_paragraphs p ON p.id = f.paragraph_id
                                WHERE f.book_fts MATCH ? AND f.book_id = ?
                                ORDER BY p.chapter_index ASC, p.paragraph_index ASC
                                LIMIT ?",
                    None => "SELECT p.id, p.book_id, p.book_title, p.book_author, p.cover_color,
                                    p.chapter_index, p.chapter_title, p.paragraph_index, p.char_offset, p.content
                             FROM book_fts f
                             JOIN book_paragraphs p ON p.id = f.paragraph_id
                             WHERE f.book_fts MATCH ?
                             LIMIT ?",
                };

                if let Ok(mut stmt) = conn.prepare(query_sql) {
                    let map_fn = |r: &rusqlite::Row| -> rusqlite::Result<RawParagraph> {
                        Ok(RawParagraph {
                            id: r.get(0)?,
                            book_id: r.get(1)?,
                            book_title: r.get(2)?,
                            book_author: r.get(3)?,
                            cover_color: r.get(4)?,
                            chapter_index: r.get(5)?,
                            chapter_title: r.get(6)?,
                            paragraph_index: r.get(7)?,
                            char_offset: r.get(8)?,
                            content: r.get(9)?,
                        })
                    };

                    let candidate_rows: Vec<RawParagraph> = match &target_book {
                        Some(bid) => stmt
                            .query_map(params![fts_expr, bid, candidate_limit as i64], map_fn)
                            .map(|rows| rows.filter_map(|r| r.ok()).collect())
                            .unwrap_or_default(),
                        None => stmt
                            .query_map(params![fts_expr, candidate_limit as i64], map_fn)
                            .map(|rows| rows.filter_map(|r| r.ok()).collect())
                            .unwrap_or_default(),
                    };

                    let mut filtered = candidate_rows;
                    if terms.len() > 1 {
                        filtered.retain(|r| {
                            let hay = format!("{}\n{}\n{}", r.content, r.chapter_title, r.book_title).to_lowercase();
                            lower_terms.iter().all(|lt| hay.contains(lt))
                        });
                    }

                    if !filtered.is_empty() {
                        used_fts = true;
                        let selected = if target_book.is_none() {
                            diversify_across_books(filtered, effective_limit)
                        } else {
                            filtered.into_iter().take(effective_limit).collect()
                        };
                        chapter_hits = selected
                            .into_iter()
                            .map(|p| p.into_search_hit(&lower_q, &terms, &lower_terms))
                            .collect();
                    }
                }
            }

            // 2. Fallback to indexed LIKE scan with escaped wildcards (for 1-2 char CJK terms like "冰块", "逻辑", "韩立")
            if chapter_hits.is_empty() && !terms.is_empty() {
                let mut where_clauses = Vec::new();
                let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

                if let Some(bid) = &target_book {
                    where_clauses.push("p.book_id = ?");
                    params_vec.push(bid.clone().into());
                }

                for term in &terms {
                    let pat = format!("%{}%", escape_sql_like(term));
                    // 仅检索正文和章节标题，避免书名匹配导致整书成千上万段落全部误命中
                    where_clauses.push("(p.content LIKE ? ESCAPE '\\' OR p.chapter_title LIKE ? ESCAPE '\\')");
                    params_vec.push(pat.clone().into());
                    params_vec.push(pat.into());
                }

                let candidate_limit = if target_book.is_some() {
                    effective_limit
                } else {
                    (effective_limit * 2).clamp(20, 60)
                };
                params_vec.push((candidate_limit as i64).into());

                // 针对单书使用索引顺序，针对跨书则去掉全局排序以利用 LIMIT 快速早停（耗时从 3000ms 降至 10ms）
                let order_clause = if target_book.is_some() {
                    "ORDER BY p.chapter_index ASC, p.paragraph_index ASC"
                } else {
                    ""
                };

                let sql = format!(
                    "SELECT p.id, p.book_id, p.book_title, p.book_author, p.cover_color,
                            p.chapter_index, p.chapter_title, p.paragraph_index, p.char_offset, p.content
                     FROM book_paragraphs p
                     WHERE {}
                     {}
                     LIMIT ?",
                    where_clauses.join(" AND "),
                    order_clause
                );

                let mut stmt = conn.prepare(&sql)?;
                let raw_rows: Vec<RawParagraph> = stmt
                    .query_map(rusqlite::params_from_iter(params_vec.iter()), |r| {
                        Ok(RawParagraph {
                            id: r.get(0)?,
                            book_id: r.get(1)?,
                            book_title: r.get(2)?,
                            book_author: r.get(3)?,
                            cover_color: r.get(4)?,
                            chapter_index: r.get(5)?,
                            chapter_title: r.get(6)?,
                            paragraph_index: r.get(7)?,
                            char_offset: r.get(8)?,
                            content: r.get(9)?,
                        })
                    })?
                    .filter_map(|r| r.ok())
                    .collect();

                let selected = if target_book.is_none() {
                    diversify_across_books(raw_rows, effective_limit)
                } else {
                    raw_rows.into_iter().take(effective_limit).collect()
                };

                chapter_hits = selected
                    .into_iter()
                    .map(|p| p.into_search_hit(&lower_q, &terms, &lower_terms))
                    .collect();
            }

            // 3. Search highlights & notes
            let mut highlight_hits = Vec::new();
            if !terms.is_empty() {
                let mut hl_where = Vec::new();
                let mut hl_params: Vec<rusqlite::types::Value> = Vec::new();

                if let Some(bid) = &target_book {
                    hl_where.push("h.book_id = ?");
                    hl_params.push(bid.clone().into());
                }

                for term in &terms {
                    let pat = format!("%{}%", escape_sql_like(term));
                    hl_where.push("(h.selected_text LIKE ? ESCAPE '\\' OR h.note LIKE ? ESCAPE '\\')");
                    hl_params.push(pat.clone().into());
                    hl_params.push(pat.into());
                }

                let hl_sql = format!(
                    "SELECT h.id, h.book_id, h.chapter_index, h.chapter_title, h.selected_text,
                            h.paragraph_index, h.start_offset, h.end_offset, h.cfi_range, h.style_type,
                            h.color, h.note, h.created_at, h.updated_at, b.title, b.author, b.cover_color
                     FROM highlights h
                     LEFT JOIN books b ON b.id = h.book_id
                     WHERE {}
                     ORDER BY h.created_at DESC
                     LIMIT 20",
                    hl_where.join(" AND ")
                );

                if let Ok(mut hl_stmt) = conn.prepare(&hl_sql) {
                    if let Ok(mut rows) = hl_stmt.query(rusqlite::params_from_iter(hl_params.iter())) {
                        while let Ok(Some(r)) = rows.next() {
                            highlight_hits.push(serde_json::json!({
                                "id": r.get::<_, String>(0)?,
                                "book_id": r.get::<_, String>(1)?,
                                "chapter_index": r.get::<_, i64>(2)?,
                                "chapter_title": r.get::<_, String>(3)?,
                                "selected_text": r.get::<_, String>(4)?,
                                "paragraph_index": r.get::<_, Option<i64>>(5)?.unwrap_or(0),
                                "style_type": r.get::<_, Option<String>>(9)?.unwrap_or_else(|| "marker".into()),
                                "color": r.get::<_, String>(10)?,
                                "note": r.get::<_, Option<String>>(11)?,
                                "book_title": r.get::<_, Option<String>>(14)?.unwrap_or_default(),
                                "book_author": r.get::<_, Option<String>>(15)?.unwrap_or_default(),
                                "cover_color": r.get::<_, Option<String>>(16)?.unwrap_or_else(|| "#1e293b".into()),
                            }));
                        }
                    }
                }
            }

            let mut books_set: HashSet<String> = HashSet::new();
            let mut total_occurrences = 0;
            for h in &chapter_hits {
                books_set.insert(h.book_id.clone());
                total_occurrences += h.match_count;
            }
            for hh in &highlight_hits {
                if let Some(bid) = hh.get("book_id").and_then(|v| v.as_str()) {
                    books_set.insert(bid.to_string());
                }
            }

            let elapsed = (start.elapsed().as_secs_f64() * 1000.0 * 100.0).round() / 100.0;
            let engine = if used_fts || !trigram_terms.is_empty() {
                "SQLite FTS5 Trigram Inverted Index"
            } else {
                "SQLite Indexed Paragraph Scan"
            };

            Ok(serde_json::json!({
                "query": query_str,
                "elapsed_ms": elapsed,
                "engine": engine,
                "total_matches": total_occurrences + highlight_hits.len(),
                "books_matched": books_set.len(),
                "chapter_hits": chapter_hits,
                "highlight_hits": highlight_hits,
            }))
        }).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escape_sql_like() {
        assert_eq!(escape_sql_like("100%_test\\a"), "100\\%\\_test\\\\a");
    }

    #[test]
    fn test_utf8_snippet_and_diversify() {
        let p1 = RawParagraph {
            id: "1".into(),
            book_id: "b1".into(),
            book_title: "明朝那些事儿".into(),
            book_author: "当年明月".into(),
            cover_color: Some("#000".into()),
            chapter_index: 0,
            chapter_title: "第一章".into(),
            paragraph_index: 2,
            char_offset: 100,
            content: "前缀文字在这里，朱元璋建立明朝，后面的文字继续延伸用来测试UTF8多字节截断安全性。".into(),
        };
        let p2 = RawParagraph {
            id: "2".into(),
            book_id: "b1".into(),
            book_title: "明朝那些事儿".into(),
            book_author: "当年明月".into(),
            cover_color: Some("#000".into()),
            chapter_index: 1,
            chapter_title: "第二章".into(),
            paragraph_index: 0,
            char_offset: 200,
            content: "朱元璋再次出现。".into(),
        };
        let p3 = RawParagraph {
            id: "3".into(),
            book_id: "b2".into(),
            book_title: "诡秘之主".into(),
            book_author: "爱潜水的乌贼".into(),
            cover_color: Some("#111".into()),
            chapter_index: 0,
            chapter_title: "第一章".into(),
            paragraph_index: 0,
            char_offset: 0,
            content: "克莱恩与朱元璋的跨书检索测试。".into(),
        };

        let hit = p1.into_search_hit("朱元璋", &["朱元璋".into()], &["朱元璋".into()]);
        assert_eq!(hit.match_text, "朱元璋");
        assert_eq!(hit.match_count, 1);
        assert_eq!(hit.match_offset_in_para, 8);
        assert!(hit.full_paragraph.contains("朱元璋"));
        assert!(hit.snippet_before.contains("前缀文字"));

        let diversified = diversify_across_books(vec![p2, p3], 2);
        assert_eq!(diversified.len(), 2);
        assert_eq!(diversified[0].book_id, "b1");
        assert_eq!(diversified[1].book_id, "b2");
    }
}


