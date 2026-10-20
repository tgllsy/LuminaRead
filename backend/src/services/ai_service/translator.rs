use serde_json::Value;
use std::collections::HashMap;

use crate::infra::db::DbContext;

use super::translation_engine::{
    is_mostly_english_text, is_valid_cached_translation, sha256_hex, translate_live_batch,
};

pub use super::translation_engine::translate_text_real;

struct ParaMeta {
    idx: usize,
    source: String,
    is_en: bool,
    target_lang: String,
    hash: String,
    translation: Option<String>,
}

async fn lookup_cached_translations(db: &DbContext, items: &mut [ParaMeta]) {
    let hashes: Vec<String> = items
        .iter()
        .filter(|it| it.translation.is_none() && !it.source.is_empty())
        .map(|it| it.hash.clone())
        .collect();

    if hashes.is_empty() {
        return;
    }

    let cached_map: HashMap<String, String> = db
        .interact(move |conn| {
            let mut map = HashMap::new();
            if let Ok(mut stmt) =
                conn.prepare("SELECT translated_text FROM translation_cache WHERE source_hash = ?")
            {
                for h in hashes {
                    if let Ok(t) = stmt.query_row(rusqlite::params![&h], |r| r.get::<_, String>(0)) {
                        if is_valid_cached_translation(&t) {
                            map.insert(h, t);
                        }
                    }
                }
            }
            Ok(map)
        })
        .await
        .unwrap_or_default();

    for it in items {
        if it.translation.is_none() {
            if let Some(t) = cached_map.get(&it.hash) {
                it.translation = Some(t.clone());
            }
        }
    }
}

fn group_uncached_batches(items: &[ParaMeta]) -> Vec<(String, Vec<usize>)> {
    let uncached: Vec<usize> = items
        .iter()
        .enumerate()
        .filter(|(_, it)| {
            it.translation.is_none()
                && !it.source.is_empty()
                && !it.source.starts_with("[[PDF_PAGE:")
                && !it.source.starts_with("[[BOOK_IMAGE:")
        })
        .map(|(i, _)| i)
        .collect();

    if uncached.is_empty() {
        return Vec::new();
    }

    let mut batches = Vec::new();
    let mut cur_batch = Vec::new();
    let mut cur_chars = 0usize;
    let mut cur_lang = items[uncached[0]].target_lang.clone();

    for idx in uncached {
        let clean_len = items[idx].source.chars().count();
        if items[idx].target_lang != cur_lang || cur_chars + clean_len > 1300 || cur_batch.len() >= 12 {
            if !cur_batch.is_empty() {
                batches.push((cur_lang.clone(), cur_batch));
            }
            cur_batch = vec![idx];
            cur_chars = clean_len;
            cur_lang = items[idx].target_lang.clone();
        } else {
            cur_batch.push(idx);
            cur_chars += clean_len + 1;
        }
    }
    if !cur_batch.is_empty() {
        batches.push((cur_lang, cur_batch));
    }
    batches
}

async fn translate_immediate_batches(
    db: &DbContext,
    items: &mut [ParaMeta],
    batches: Vec<(String, Vec<usize>)>,
) {
    let mut new_cache_rows = Vec::new();
    for (lang, batch_idxs) in batches {
        let joined = batch_idxs
            .iter()
            .map(|&i| items[i].source.replace(['\r', '\n'], " "))
            .collect::<Vec<_>>()
            .join("\n");

        if let Some(trans_joined) = translate_live_batch(&joined, &lang).await {
            let lines: Vec<&str> = trans_joined.split('\n').collect();
            let matches_len = lines.len() == batch_idxs.len();
            for (pos, &item_idx) in batch_idxs.iter().enumerate() {
                let t = if matches_len {
                    lines[pos].trim().to_string()
                } else {
                    let single_src = items[item_idx].source.replace(['\r', '\n'], " ");
                    translate_live_batch(&single_src, &lang).await.unwrap_or_default()
                };
                if !t.is_empty() {
                    items[item_idx].translation = Some(t.clone());
                    new_cache_rows.push((
                        items[item_idx].hash.clone(),
                        items[item_idx].source.clone(),
                        items[item_idx].target_lang.clone(),
                        t,
                    ));
                }
            }
        }
    }

    if !new_cache_rows.is_empty() {
        let now_str = chrono::Utc::now().to_rfc3339();
        let _ = db
            .interact(move |conn| {
                let tx = conn.transaction()?;
                {
                    let mut stmt = tx.prepare(
                        "INSERT OR REPLACE INTO translation_cache (source_hash, source_text, target_lang, translated_text, created_at)
                         VALUES (?, ?, ?, ?, ?)",
                    )?;
                    for (h, s, tl, tr) in new_cache_rows {
                        let _ = stmt.execute(rusqlite::params![h, s, tl, tr, &now_str]);
                    }
                }
                tx.commit()?;
                Ok(())
            })
            .await;
    }
}

fn spawn_deferred_translation(
    db: DbContext,
    items: &[ParaMeta],
    batches: Vec<(String, Vec<usize>)>,
) {
    let deferred_data: Vec<(String, Vec<(String, String, String)>)> = batches
        .into_iter()
        .map(|(lang, idxs)| {
            let entries = idxs
                .into_iter()
                .map(|i| (items[i].hash.clone(), items[i].source.clone(), items[i].target_lang.clone()))
                .collect();
            (lang, entries)
        })
        .collect();

    tokio::spawn(async move {
        for (lang, entries) in deferred_data {
            let joined = entries
                .iter()
                .map(|(_, src, _)| src.replace(['\r', '\n'], " "))
                .collect::<Vec<_>>()
                .join("\n");
            if let Some(trans_joined) = translate_live_batch(&joined, &lang).await {
                let lines: Vec<&str> = trans_joined.split('\n').collect();
                if lines.len() == entries.len() {
                    let now_str = chrono::Utc::now().to_rfc3339();
                    let rows: Vec<(String, String, String, String)> = entries
                        .into_iter()
                        .enumerate()
                        .filter_map(|(idx, (h, s, tl))| {
                            let t = lines[idx].trim().to_string();
                            if t.is_empty() {
                                None
                            } else {
                                Some((h, s, tl, t))
                            }
                        })
                        .collect();
                    let _ = db
                        .interact(move |conn| {
                            let tx = conn.transaction()?;
                            {
                                let mut stmt = tx.prepare(
                                    "INSERT OR REPLACE INTO translation_cache (source_hash, source_text, target_lang, translated_text, created_at)
                                     VALUES (?, ?, ?, ?, ?)",
                                )?;
                                for (h, s, tl, tr) in rows {
                                    let _ = stmt.execute(rusqlite::params![h, s, tl, tr, &now_str]);
                                }
                            }
                            tx.commit()?;
                            Ok(())
                        })
                        .await;
                }
            }
        }
    });
}

pub async fn translate_chapter_paragraphs(db: &DbContext, paragraphs: &[String]) -> Vec<Value> {
    if paragraphs.is_empty() {
        return Vec::new();
    }

    let mut items: Vec<ParaMeta> = paragraphs
        .iter()
        .enumerate()
        .map(|(idx, p)| {
            let trimmed = p.trim().to_string();
            let is_en = is_mostly_english_text(&trimmed);
            let tl = if is_en { "zh-CN" } else { "en" }.to_string();
            let hash = sha256_hex(&format!("{}:{}", tl, trimmed));
            ParaMeta {
                idx,
                source: trimmed,
                is_en,
                target_lang: tl,
                hash,
                translation: None,
            }
        })
        .collect();

    lookup_cached_translations(db, &mut items).await;

    let batches = group_uncached_batches(&items);
    if !batches.is_empty() {
        let immediate_count = batches.len().min(3);
        let immediate_batches = batches[..immediate_count].to_vec();
        let deferred_batches = batches[immediate_count..].to_vec();

        translate_immediate_batches(db, &mut items, immediate_batches).await;
        if !deferred_batches.is_empty() {
            spawn_deferred_translation(db.clone(), &items, deferred_batches);
        }
    }

    items
        .into_iter()
        .map(|it| {
            serde_json::json!({
                "paragraph_index": it.idx,
                "is_english": it.is_en,
                "translation": it.translation.unwrap_or_default(),
            })
        })
        .collect()
}
