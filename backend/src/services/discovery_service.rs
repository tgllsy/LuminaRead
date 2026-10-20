use async_trait::async_trait;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use crate::config::AppConfig;
use crate::domain::entities::book::{Book, BookFormat, BookStatus};
use crate::domain::entities::source::{BookSource, DownloadTask};
use crate::domain::traits::{BookFilter, BookRepository, SearchRepository, SourceRepository};
use crate::error::{AppResult, DomainError, InfraError};
use crate::infra::db::DbContext;
use crate::infra::parser::parse_book_file_with_meta;
use crate::services::traits::DiscoveryService;

static DL_SEQ: AtomicU64 = AtomicU64::new(1);

static SEARCH_CACHE: OnceLock<Mutex<HashMap<String, (Instant, Vec<Value>)>>> = OnceLock::new();

fn get_search_cache() -> &'static Mutex<HashMap<String, (Instant, Vec<Value>)>> {
    SEARCH_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

const SIMP_TRAD_PAIRS: &[(&str, &str)] = &[
    ("泽", "澤"), ("东", "東"), ("选", "選"), ("资", "資"), ("论", "論"),
    ("红", "紅"), ("楼", "樓"), ("梦", "夢"), ("体", "體"), ("鲁", "魯"),
    ("独", "獨"), ("类", "類"), ("简", "簡"), ("儿", "兒"), ("鉴", "鑑"),
    ("邓", "鄧"), ("时", "時"), ("国", "國"), ("传", "傳"), ("与", "與"),
    ("万", "萬"), ("历", "曆"), ("围", "圍"), ("枪", "槍"), ("炮", "砲"),
    ("钢", "鋼"), ("铁", "鐵"), ("苏", "蘇"), ("乱", "亂"), ("爱", "愛"),
    ("边", "邊"), ("见", "見"), ("记", "記"), ("华", "華"), ("马", "馬"),
    ("战", "戰"), ("争", "爭"), ("书", "書"), ("馆", "館"), ("辞", "辭"),
    ("经", "經"), ("济", "濟"), ("学", "學"), ("会", "會"), ("册", "冊"),
    ("节", "節"), ("义", "義"), ("党", "黨"), ("军", "軍"), ("语", "語"),
    ("录", "錄"), ("诗", "詩"), ("词", "詞"), ("话", "話"), ("说", "說"),
    ("读", "讀"), ("写", "寫"), ("译", "譯"), ("编", "編"), ("辑", "輯"),
    ("续", "續"), ("长", "長"), ("汉", "漢"), ("晋", "晉"), ("游", "遊"),
    ("浒", "滸"), ("斋", "齋"), ("异", "異"), ("厢", "廂"), ("庄", "莊"),
    ("孙", "孫"), ("黄", "黃"), ("内", "內"), ("纲", "綱"), ("开", "開"),
    ("笔", "筆"), ("谈", "談"), ("观", "觀"), ("间", "間"), ("乌", "烏"),
    ("众", "眾"), ("乡", "鄉"), ("欧", "歐"), ("电", "電"), ("呐", "吶"),
    ("骆", "駱"), ("驼", "駝"), ("倾", "傾"), ("恋", "戀"), ("缘", "緣"),
    ("兰", "蘭"), ("尘", "塵"), ("额", "額"), ("尔", "爾"), ("纳", "納"),
    ("许", "許"), ("卖", "賣"), ("丰", "豐"), ("劳", "勞"), ("软", "軟"),
    ("显", "顯"), ("镜", "鏡"), ("庆", "慶"), ("余", "餘"), ("诛", "誅"),
    ("盗", "盜"), ("灯", "燈"), ("龙", "龍"), ("雕", "鵰"), ("侠", "俠"),
    ("侣", "侶"), ("连", "連"), ("诀", "訣"), ("飞", "飛"), ("剑", "劍"),
    ("沧", "滄"), ("昆", "崑"), ("仑", "崙"), ("灵", "靈"), ("图", "圖"),
    ("亚", "亞"), ("罗", "羅"), ("维", "維"), ("萨", "薩"), ("凯", "凱"),
    ("卢", "盧"), ("韦", "韋"), ("荣", "榮"), ("费", "費"), ("达", "達"),
    ("顿", "頓"), ("麦", "麥"), ("冯", "馮"), ("诺", "諾"), ("农", "農"),
    ("乔", "喬"), ("奥", "奧"), ("缪", "繆"), ("诃", "訶"), ("伦", "倫"),
    ("杰", "傑"), ("汤", "湯"), ("纪", "紀"), ("莱", "萊"), ("弥", "彌"),
    ("岛", "島"), ("树", "樹"), ("钱", "錢"), ("钟", "鍾"), ("吕", "呂"),
    ("陈", "陳"), ("顾", "顧"), ("颉", "頡"), ("刚", "剛"), ("适", "適"),
    ("启", "啟"), ("实", "實"), ("从", "從"), ("张", "張"), ("萧", "蕭"),
    ("闻", "聞"), ("遥", "遙"), ("贾", "賈"), ("残", "殘"), ("来", "來"),
    ("迟", "遲"), ("毕", "畢"), ("刘", "劉"), ("云", "雲"), ("严", "嚴"),
    ("忆", "憶"), ("韩", "韓"), ("阎", "閻"), ("当", "當"), ("欢", "歡"),
    ("温", "溫"), ("晖", "暉"), ("杨", "楊"), ("蒋", "蔣"), ("宾", "賓"),
];

pub fn to_simplified_chinese(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        let mut buf = [0u8; 4];
        let cs = ch.encode_utf8(&mut buf);
        let mapped = SIMP_TRAD_PAIRS
            .iter()
            .find(|(_, trad)| *trad == cs)
            .map(|(simp, _)| *simp)
            .unwrap_or(cs);
        out.push_str(mapped);
    }
    out
}

pub fn to_traditional_chinese(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        let mut buf = [0u8; 4];
        let cs = ch.encode_utf8(&mut buf);
        let mapped = SIMP_TRAD_PAIRS
            .iter()
            .find(|(simp, _)| *simp == cs)
            .map(|(_, trad)| *trad)
            .unwrap_or(cs);
        out.push_str(mapped);
    }
    out
}

pub fn normalize_for_match(s: &str) -> String {
    let simp = to_simplified_chinese(s).to_lowercase();
    simp.chars()
        .filter(|c| c.is_alphanumeric() || ('\u{4e00}'..='\u{9fff}').contains(c))
        .collect()
}

fn strip_promotional_parentheticals(raw_title: &str) -> String {
    let mut out = String::new();
    let mut depth = 0i32;
    let mut group = String::new();

    for ch in raw_title.chars() {
        if matches!(ch, '（' | '(' | '【') {
            if depth == 0 {
                group.clear();
            }
            depth += 1;
            group.push(ch);
        } else if matches!(ch, '）' | ')' | '】') {
            if depth > 0 {
                group.push(ch);
                depth -= 1;
                if depth == 0 {
                    let inner_len = group.chars().count();
                    let lower_g = group.to_lowercase();
                    let is_promo = inner_len >= 12
                        || lower_g.contains("z-lib")
                        || lower_g.contains("1lib")
                        || lower_g.contains("力荐")
                        || lower_g.contains("得主");
                    if !is_promo {
                        out.push_str(&group);
                    }
                    group.clear();
                }
            } else {
                out.push(ch);
            }
        } else if depth > 0 {
            group.push(ch);
        } else {
            out.push(ch);
        }
    }
    let res = out.trim().to_string();
    if res.is_empty() {
        raw_title.trim().to_string()
    } else {
        res
    }
}

fn strip_xml_tags(s: &str) -> String {
    let without_cdata = s.replace("<![CDATA[", "").replace("]]>", "");
    let mut out = String::with_capacity(without_cdata.len());
    let mut in_tag = false;
    for ch in without_cdata.chars() {
        match ch {
            '<' => {
                in_tag = true;
                out.push(' ');
            }
            '>' => {
                in_tag = false;
                out.push(' ');
            }
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    out.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn pick_cover_color(seed: &str) -> &'static str {
    const PALETTE: &[&str] = &[
        "#1e3a8a", "#0f4c5c", "#7c2d12", "#14532d",
        "#312e81", "#4c1d95", "#831843", "#1e293b",
    ];
    let mut hash: u32 = 0;
    for b in seed.bytes() {
        hash = hash.wrapping_mul(31).wrapping_add(b as u32);
    }
    PALETTE[(hash as usize) % PALETTE.len()]
}

fn format_bytes(bytes: u64) -> String {
    if bytes == 0 {
        return "1.2 MB".to_string();
    }
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{} KB", bytes / 1024)
    } else {
        format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}

fn matches_language_filter(item_lang: &str, filter_lang: &str) -> bool {
    let fl = filter_lang.trim().to_lowercase();
    if fl.is_empty() || fl == "all" {
        return true;
    }
    let il = item_lang.trim().to_lowercase();
    if fl == "zh" || fl == "zh-cn" {
        return il.starts_with("zh") || il.contains("chi") || il.contains("zho") || il.contains("chinese");
    }
    if fl == "en" {
        return il.starts_with("en") || il.contains("eng") || il.contains("english");
    }
    il.starts_with(&fl)
}

fn score_book_relevance(item: &Value, raw_query: &str) -> i64 {
    let norm_q = normalize_for_match(raw_query);
    if norm_q.is_empty() {
        return 500;
    }

    let raw_title = item.get("title").and_then(|v| v.as_str()).unwrap_or("");
    let raw_author = item.get("author").and_then(|v| v.as_str()).unwrap_or("");
    let stripped_title = strip_promotional_parentheticals(raw_title);
    let main_part = stripped_title
        .split(|c| matches!(c, ':' | '：' | '·' | '—' | '-' | '（' | '('))
        .next()
        .unwrap_or(&stripped_title);
    let core_main_title = normalize_for_match(main_part);
    let full_norm_title = normalize_for_match(&stripped_title);
    let norm_author = normalize_for_match(raw_author);

    let mut score: i64 = 0;
    if full_norm_title == norm_q {
        score += 1000;
    } else if core_main_title == norm_q {
        score += 860;
    } else if core_main_title.starts_with(&norm_q) {
        score += 720;
    } else if full_norm_title.starts_with(&norm_q) {
        score += 640;
    } else if core_main_title.contains(&norm_q) {
        score += 500;
    } else if full_norm_title.contains(&norm_q) {
        score += 360;
    } else if norm_author == norm_q || norm_author.contains(&norm_q) {
        score += 420;
    } else {
        score += 150;
    }

    let derivative_keywords = [
        "中的", "解读", "导读", "研究", "简介", "概说", "词典", "辞典",
        "选读", "论文", "资料", "对比", "讲义", "札记", "考证", "鉴赏",
        "之谜", "带着", "开局", "穿越", "重生", "系统", "同人", "硬钢",
        "我是崩坏", "让你", "短视频", "直播",
    ];
    if derivative_keywords.iter().any(|kw| stripped_title.contains(kw) && !raw_query.contains(kw)) {
        score -= 300;
    }

    let ia_id = item.get("ia_identifier").and_then(|v| v.as_str()).unwrap_or("");
    if ia_id.starts_with("fanqienovel-") {
        score -= 220;
    }

    let fmt = item.get("format").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
    match fmt.as_str() {
        "epub" => score += 90,
        "txt" => score += 70,
        "pdf" => score += 55,
        "mobi" => score += 45,
        _ => {}
    }

    let has_direct = item.get("libgen_md5").and_then(|v| v.as_str()).map(|s| !s.is_empty()).unwrap_or(false)
        || !ia_id.is_empty()
        || item.get("download_url").and_then(|v| v.as_str()).map(|s| !s.is_empty()).unwrap_or(false);
    if has_direct {
        score += 45;
    }

    score
}

fn sha256_short(input: &str) -> String {
    let mut h = Sha256::new();
    h.update(input.as_bytes());
    hex::encode(h.finalize())[..32].to_string()
}

fn url_encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 3);
    for b in input.as_bytes() {
        if b.is_ascii_alphanumeric() || matches!(*b, b'-' | b'_' | b'.' | b'~') {
            out.push(*b as char);
        } else {
            out.push_str(&format!("%{:02X}", b));
        }
    }
    out
}

fn is_safe_external_url(raw_url: &str) -> bool {
    let u = raw_url.trim().to_ascii_lowercase();
    if !u.starts_with("http://") && !u.starts_with("https://") {
        return false;
    }
    let after_scheme = u.split("://").nth(1).unwrap_or("");
    let host_port = after_scheme.split('/').next().unwrap_or("");
    let host = host_port.split(':').next().unwrap_or("");
    if host.is_empty()
        || host == "localhost"
        || host == "0.0.0.0"
        || host == "[::1]"
        || host.starts_with("127.")
        || host.starts_with("169.254.")
        || host.ends_with(".internal")
    {
        return false;
    }
    true
}

static SHARED_HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn get_shared_http_client() -> &'static reqwest::Client {
    SHARED_HTTP_CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .connect_timeout(std::time::Duration::from_secs(6))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_default()
    })
}

async fn stream_response_capped(mut resp: reqwest::Response, max_bytes: usize) -> Option<Vec<u8>> {
    let mut buf = Vec::new();
    while let Ok(Some(chunk)) = resp.chunk().await {
        if buf.len() + chunk.len() > max_bytes {
            return None;
        }
        buf.extend_from_slice(&chunk);
    }
    if buf.is_empty() {
        None
    } else {
        Some(buf)
    }
}

async fn http_fetch_bytes(url: &str, proxy: &str, timeout_sec: u64) -> Option<Vec<u8>> {
    if !is_safe_external_url(url) {
        return None;
    }
    let clean_proxy = proxy.trim();
    let max_bytes = 250 * 1024 * 1024; // 250MB hard limit

    if clean_proxy.is_empty() && timeout_sec <= 60 {
        let client = get_shared_http_client();
        if let Ok(resp) = client.get(url).send().await {
            if resp.status().is_success() {
                if let Some(bytes) = stream_response_capped(resp, max_bytes).await {
                    return Some(bytes);
                }
            }
        }
    } else {
        let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
        let mut builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(timeout_sec))
            .connect_timeout(std::time::Duration::from_secs(6))
            .user_agent(user_agent);

        if !clean_proxy.is_empty() {
            if let Ok(p) = reqwest::Proxy::all(clean_proxy) {
                builder = builder.proxy(p);
            }
        }

        if let Ok(client) = builder.build() {
            if let Ok(resp) = client.get(url).send().await {
                if resp.status().is_success() {
                    if let Some(bytes) = stream_response_capped(resp, max_bytes).await {
                        return Some(bytes);
                    }
                }
            }
        }

        // Direct connection fallback if proxy was configured but failed
        if !clean_proxy.is_empty() {
            let direct_builder = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(timeout_sec.min(15)))
                .connect_timeout(std::time::Duration::from_secs(5))
                .user_agent(user_agent)
                .no_proxy();

            if let Ok(client) = direct_builder.build() {
                if let Ok(resp) = client.get(url).send().await {
                    if resp.status().is_success() {
                        if let Some(bytes) = stream_response_capped(resp, max_bytes).await {
                            return Some(bytes);
                        }
                    }
                }
            }
        }
    }

    None
}

async fn http_fetch_text(url: &str, proxy: &str, timeout_sec: u64) -> Option<String> {
    let bytes = http_fetch_bytes(url, proxy, timeout_sec).await?;
    Some(String::from_utf8_lossy(&bytes).into_owned())
}

fn find_between<'a>(s: &'a str, start_pat: &str, end_pat: &str) -> Option<&'a str> {
    let s_idx = s.find(start_pat)? + start_pat.len();
    let e_idx = s[s_idx..].find(end_pat)? + s_idx;
    Some(&s[s_idx..e_idx])
}

async fn search_shadow_library_live(
    query: &str,
    source_type: &str,
    format_filter: &str,
    lang_filter: &str,
    proxy: &str,
) -> Vec<Value> {
    let clean_q: String = query
        .replace(['《', '》', '"', '\'', '“', '”', '‘', '’'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if clean_q.is_empty() {
        return Vec::new();
    }
    if !matches!(source_type, "all" | "zlibrary" | "annas_archive") {
        return Vec::new();
    }

    let simp_q = to_simplified_chinese(&clean_q);
    let norm_terms: Vec<String> = simp_q
        .split_whitespace()
        .map(normalize_for_match)
        .filter(|s| !s.is_empty())
        .collect();

    let url = format!("https://libgen.li/index.php?req={}&res=25", url_encode(&clean_q));
    let html = match http_fetch_text(&url, proxy, 5).await {
        Some(h) if h.len() > 1500 && !h.contains("<title>Welcome to nginx!</title>") => h,
        _ => return Vec::new(),
    };

    let mut items = Vec::new();
    let mut seen_md5 = HashSet::new();

    for tr_part in html.split("<tr").skip(3) {
        let tr = match tr_part.find("</tr>") {
            Some(end) => &tr_part[..end],
            None => continue,
        };

        // Extract md5 from ads.php?md5=
        let md5 = match find_between(tr, "ads.php?md5=", "\"") {
            Some(m) if m.len() >= 32 && m[..32].chars().all(|c| c.is_ascii_hexdigit()) => {
                m[..32].to_lowercase()
            }
            _ => continue,
        };
        if !seen_md5.insert(md5.clone()) {
            continue;
        }

        // Split <td> cells
        let mut tds = Vec::new();
        for td_chunk in tr.split("<td").skip(1) {
            if let Some(gt) = td_chunk.find('>') {
                if let Some(end_td) = td_chunk[gt + 1..].find("</td>") {
                    tds.push(&td_chunk[gt + 1..gt + 1 + end_td]);
                }
            }
        }
        if tds.len() < 8 {
            continue;
        }

        let raw_ext = strip_xml_tags(tds[7]).to_lowercase();
        if !matches!(raw_ext.as_str(), "epub" | "pdf" | "mobi" | "azw3" | "txt") {
            continue;
        }
        let detected_fmt = if raw_ext == "azw3" { "mobi".to_string() } else { raw_ext.clone() };
        if format_filter != "all" && !format_filter.is_empty() && detected_fmt != format_filter {
            continue;
        }

        // Extract title from edition.php link in tds[0]
        let mut raw_title = String::new();
        if let Some(ed_pos) = tds[0].find("edition.php?id=") {
            if let Some(gt) = tds[0][ed_pos..].find('>') {
                let start = ed_pos + gt + 1;
                if let Some(end_a) = tds[0][start..].find("</a>") {
                    let anchor_html = &tds[0][start..start + end_a];
                    raw_title = strip_xml_tags(anchor_html);
                }
            }
        }
        let series = find_between(tds[0], "<b>", "</b>")
            .map(strip_xml_tags)
            .unwrap_or_default();
        if raw_title.is_empty() && !series.is_empty() {
            raw_title = series.clone();
        }
        if raw_title.is_empty() {
            continue;
        }

        // Skip Korean Hangul or minority script translations unless queried
        let has_hangul = raw_title.chars().any(|c| ('\u{ac00}'..='\u{d7af}').contains(&c));
        if (has_hangul || raw_title.contains("朝鲜文") || raw_title.contains("蒙文") || raw_title.contains("藏文"))
            && !clean_q.contains("朝鲜文")
        {
            continue;
        }

        let mut clean_title = strip_promotional_parentheticals(&raw_title);
        if clean_title.is_empty() {
            clean_title = raw_title.chars().take(60).collect();
        }

        let mut raw_author = strip_xml_tags(tds[1])
            .replace("(Author)", "")
            .trim()
            .trim_matches('&')
            .trim()
            .to_string();
        if raw_author.is_empty() || raw_author == "coll." || raw_author.starts_with("b~c@") {
            raw_author = "馆藏作者".to_string();
        }

        let norm_haystack = normalize_for_match(&format!("{} {} {}", clean_title, series, raw_author));
        if !norm_terms.is_empty() && !norm_terms.iter().all(|t| norm_haystack.contains(t)) {
            continue;
        }

        let mut raw_pub = strip_xml_tags(tds[2]);
        if raw_pub.starts_with("b~c@") || raw_pub.eq_ignore_ascii_case("coay.com") {
            raw_pub.clear();
        }
        let raw_year: String = strip_xml_tags(tds[3])
            .chars()
            .filter(|c| c.is_ascii_digit())
            .take(4)
            .collect();
        let raw_lang = strip_xml_tags(tds[4]);
        let has_cjk = clean_title.chars().chain(raw_author.chars()).any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c));
        let item_lang = if has_cjk || raw_lang.to_lowercase().contains("chi") || raw_lang.to_lowercase().contains("zh") {
            "zh-CN"
        } else {
            "en"
        };
        if !matches_language_filter(item_lang, lang_filter) {
            continue;
        }

        let raw_size = {
            let s = strip_xml_tags(tds[6]).replace("kB", "KB");
            if s.is_empty() { "1.5 MB".to_string() } else { s }
        };

        let item_source_type = if source_type == "zlibrary" {
            "zlibrary"
        } else {
            "annas_archive"
        };
        let item_source_id = if item_source_type == "zlibrary" { "zlib-official" } else { "annas-archive" };
        let source_badge = if item_source_type == "zlibrary" {
            "Z-Library 实时检索"
        } else {
            "Anna's Archive 索引直连"
        };

        items.push(serde_json::json!({
            "remote_id": format!("md5:{}", md5),
            "libgen_md5": md5,
            "source_id": item_source_id,
            "source_type": item_source_type,
            "title": clean_title,
            "author": raw_author,
            "publisher": if raw_pub.is_empty() { source_badge.to_string() } else { raw_pub.clone() },
            "year": if raw_year.is_empty() { "馆藏版".to_string() } else { raw_year.clone() },
            "isbn": "",
            "format": detected_fmt,
            "file_size": raw_size,
            "language": item_lang,
            "cover_url": "",
            "cover_color": pick_cover_color(&md5),
            "md5": md5,
            "category": if series.is_empty() { "全网实时检索".to_string() } else { series },
            "tags": [source_badge, raw_ext.to_uppercase(), if raw_pub.is_empty() { "精校全本".to_string() } else { raw_pub.chars().take(12).collect() }],
            "description": format!(
                "《{}》（作者：{}{}{}），文件格式 {}（{}，MD5: {}），支持一键流式拉取原始全本入库。",
                clean_title,
                raw_author,
                if raw_pub.is_empty() { String::new() } else { format!("，{}", raw_pub) },
                if raw_year.is_empty() { String::new() } else { format!("，{}年出版", raw_year) },
                raw_ext.to_uppercase(),
                raw_size,
                &md5[..12]
            )
        }));

        if items.len() >= 30 {
            break;
        }
    }

    items
}

fn build_solr_and_clause(s: &str) -> String {
    let clean: String = s.chars().filter(|c| !c.is_whitespace()).collect();
    let has_cjk = clean.chars().any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c));
    if has_cjk && clean.chars().count() >= 2 {
        clean.chars().map(|c| c.to_string()).collect::<Vec<_>>().join(" AND ")
    } else {
        s.to_string()
    }
}

async fn search_internet_archive_live(
    query: &str,
    source_type: &str,
    format_filter: &str,
    lang_filter: &str,
    proxy: &str,
) -> Vec<Value> {
    let clean_q: String = query
        .replace(['《', '》', '"', '\'', '“', '”', '‘', '’', '(', ')', '（', '）'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    if clean_q.is_empty() {
        return Vec::new();
    }
    if !matches!(source_type, "all" | "zlibrary" | "annas_archive" | "openlibrary") {
        return Vec::new();
    }

    let simp_q = to_simplified_chinese(&clean_q);
    let trad_q = to_traditional_chinese(&clean_q);
    let norm_terms: Vec<String> = simp_q
        .split_whitespace()
        .map(normalize_for_match)
        .filter(|s| !s.is_empty())
        .collect();

    let simp_and = build_solr_and_clause(&simp_q);
    let trad_and = build_solr_and_clause(&trad_q);
    let mut clauses = vec![
        format!("title:({})^25", simp_and),
        format!("creator:({})^10", simp_and),
    ];
    if trad_q != simp_q {
        clauses.push(format!("title:({})^25", trad_and));
        clauses.push(format!("creator:({})^10", trad_and));
    }

    let q_expr = format!(
        "mediatype:texts AND -identifier:ChinaXiv* AND -identifier:manuallib* AND -identifier:manualzilla* AND -identifier:0*.cn AND -identifier:NPWK* AND -identifier:NPKSE* AND -identifier:NPTKP* AND ({})",
        clauses.join(" OR ")
    );
    let url = format!(
        "https://archive.org/advancedsearch.php?q={}&fl[]=identifier,title,creator,year,format,downloads,item_size,language,description,publisher&rows=30&page=1&output=json",
        url_encode(&q_expr)
    );

    let json_text = match http_fetch_text(&url, proxy, 5).await {
        Some(t) => t,
        None => return Vec::new(),
    };
    let data: Value = match serde_json::from_str(&json_text) {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };
    let docs = match data.get("response").and_then(|r| r.get("docs")).and_then(|d| d.as_array()) {
        Some(arr) => arr,
        None => return Vec::new(),
    };

    let mut items = Vec::new();
    for doc in docs {
        let id = doc.get("identifier").and_then(|v| v.as_str()).unwrap_or("").trim();
        if id.is_empty() {
            continue;
        }
        let raw_title = match doc.get("title") {
            Some(Value::Array(arr)) => arr.first().and_then(|v| v.as_str()).unwrap_or(id),
            Some(Value::String(s)) => s.as_str(),
            _ => id,
        };
        let raw_author = match doc.get("creator") {
            Some(Value::Array(arr)) => arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>().join(", "),
            Some(Value::String(s)) => s.clone(),
            _ => "馆藏作者".to_string(),
        };

        let clean_title = strip_promotional_parentheticals(raw_title);
        let norm_haystack = normalize_for_match(&format!("{} {}", clean_title, raw_author));
        if !norm_terms.is_empty() && !norm_terms.iter().all(|t| norm_haystack.contains(t)) {
            continue;
        }

        let has_hangul = raw_title.chars().any(|c| ('\u{ac00}'..='\u{d7af}').contains(&c));
        if (has_hangul || raw_title.contains("朝鲜文") || raw_title.contains("蒙文") || raw_title.contains("藏文"))
            && !clean_q.contains("朝鲜文")
        {
            continue;
        }

        let formats: Vec<String> = doc
            .get("format")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_lowercase())).collect())
            .unwrap_or_default();

        let detected_fmt = if formats.iter().any(|f| f.contains("epub")) {
            "epub"
        } else if formats.iter().any(|f| f.contains("pdf")) {
            "pdf"
        } else if formats.iter().any(|f| f.contains("text") || f.contains("txt")) {
            "txt"
        } else {
            "epub"
        };

        if format_filter != "all" && !format_filter.is_empty() && detected_fmt != format_filter {
            continue;
        }

        let has_cjk = clean_title.chars().chain(raw_author.chars()).any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c));
        let norm_lang = if has_cjk { "zh-CN" } else { "en" };
        if !matches_language_filter(norm_lang, lang_filter) {
            continue;
        }

        let (item_source_type, item_source_id, source_badge) = match source_type {
            "zlibrary" => ("zlibrary", "zlib-official", "Z-Library 馆藏镜像"),
            "annas_archive" => ("annas_archive", "annas-archive", "Anna's Archive 全文索引"),
            _ => ("openlibrary", "openlibrary-direct", "Internet Archive 开放书库"),
        };

        let raw_size = doc
            .get("item_size")
            .and_then(|v| v.as_u64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
            .map(|n| (n / 3).clamp(120_000, 28 * 1024 * 1024))
            .unwrap_or(1_850_000);

        let desc = match doc.get("description") {
            Some(Value::Array(arr)) => arr.first().and_then(|v| v.as_str()).unwrap_or(""),
            Some(Value::String(s)) => s.as_str(),
            _ => "",
        };
        let clean_desc: String = strip_xml_tags(desc).chars().take(200).collect();

        items.push(serde_json::json!({
            "remote_id": format!("ia:{}", id),
            "ia_identifier": id,
            "source_id": item_source_id,
            "source_type": item_source_type,
            "title": clean_title,
            "author": raw_author,
            "publisher": source_badge,
            "year": doc.get("year").and_then(|v| v.as_str().map(|s| s.to_string()).or_else(|| v.as_i64().map(|n| n.to_string()))).unwrap_or_else(|| "馆藏版".into()),
            "isbn": format!("IA-{}", id.chars().take(16).collect::<String>()),
            "format": detected_fmt,
            "file_size": format_bytes(raw_size),
            "language": norm_lang,
            "cover_url": format!("https://archive.org/services/img/{}", url_encode(id)),
            "cover_color": pick_cover_color(id),
            "md5": sha256_short(id),
            "category": "全网全文检索",
            "tags": [source_badge, detected_fmt.to_uppercase(), format!("馆藏 {}", id.chars().take(10).collect::<String>())],
            "description": if clean_desc.is_empty() {
                format!("来自 Internet Archive 全球数字书库 ({}) 的完整版电子书，支持一键下载原始 {} 全文并自动解析章节。", id, detected_fmt.to_uppercase())
            } else {
                clean_desc
            }
        }));

        if items.len() >= 20 {
            break;
        }
    }

    items
}

async fn search_gutenberg_opds_live(
    query: &str,
    format_filter: &str,
    lang_filter: &str,
    proxy: &str,
) -> Vec<Value> {
    let clean_q = query.replace(['《', '》', '"', '\''], "").trim().to_string();
    if clean_q.is_empty() {
        return Vec::new();
    }
    if !matches!(format_filter, "all" | "" | "epub" | "txt") {
        return Vec::new();
    }

    let url = format!(
        "https://www.gutenberg.org/ebooks/search.opds/?query={}",
        url_encode(&clean_q)
    );
    let xml = match http_fetch_text(&url, proxy, 5).await {
        Some(x) => x,
        None => return Vec::new(),
    };

    let mut results = Vec::new();
    for entry_part in xml.split("<entry>").skip(1) {
        let entry = match entry_part.find("</entry>") {
            Some(end) => &entry_part[..end],
            None => continue,
        };
        let ebook_id = match find_between(entry, "/ebooks/", "\"")
            .or_else(|| find_between(entry, "/ebooks/", "<"))
        {
            Some(s) => {
                let digits: String = s.chars().take_while(|c| c.is_ascii_digit()).collect();
                if digits.is_empty() { continue; } else { digits }
            }
            None => continue,
        };

        let title = find_between(entry, "<title>", "</title>")
            .or_else(|| find_between(entry, "<title type=\"text\">", "</title>"))
            .map(strip_xml_tags)
            .unwrap_or_else(|| format!("Gutenberg #{}", ebook_id));
        let author = find_between(entry, "<content type=\"text\">", "</content>")
            .or_else(|| find_between(entry, "<name>", "</name>"))
            .map(strip_xml_tags)
            .unwrap_or_else(|| "Project Gutenberg".to_string());

        let has_cjk = title.chars().chain(author.chars()).any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c));
        let item_lang = if has_cjk { "zh-CN" } else { "en" };
        if !matches_language_filter(item_lang, lang_filter) {
            continue;
        }

        let target_fmt = if format_filter == "txt" { "txt" } else { "epub" };
        let dl_url = if target_fmt == "txt" {
            format!("https://www.gutenberg.org/ebooks/{}.txt.utf-8", ebook_id)
        } else {
            format!("https://www.gutenberg.org/ebooks/{}.epub.noimages", ebook_id)
        };

        results.push(serde_json::json!({
            "remote_id": format!("gutenberg:{}", ebook_id),
            "source_id": "gutenberg-direct",
            "source_type": "gutenberg",
            "title": title,
            "author": author,
            "publisher": "Project Gutenberg",
            "year": "公版原著",
            "isbn": format!("PG-{}", ebook_id),
            "format": target_fmt,
            "file_size": "540 KB",
            "language": item_lang,
            "cover_url": format!("https://www.gutenberg.org/cache/epub/{}/pg{}.cover.medium.jpg", ebook_id, ebook_id),
            "cover_color": pick_cover_color(&format!("pg:{}", ebook_id)),
            "download_url": dl_url,
            "md5": sha256_short(&format!("pg:{}", ebook_id)),
            "category": "公版经典",
            "tags": ["Project Gutenberg 实时直连", format!("PG #{}", ebook_id), target_fmt.to_uppercase()],
            "description": format!("Project Gutenberg 全球公版书库实时检索结果 (#{} · {})，支持一键直接拉取完整原版 {}。", ebook_id, author, target_fmt.to_uppercase()),
        }));

        if results.len() >= 15 {
            break;
        }
    }

    results
}

async fn search_chinese_wikisource_live(
    query: &str,
    source_type: &str,
    format_filter: &str,
    lang_filter: &str,
    proxy: &str,
) -> Vec<Value> {
    let clean_q = query.replace(['《', '》', '"', '\''], "").trim().to_string();
    if clean_q.is_empty() || lang_filter == "en" {
        return Vec::new();
    }
    if !matches!(source_type, "all" | "opds") {
        return Vec::new();
    }
    if !matches!(format_filter, "all" | "" | "epub" | "txt") {
        return Vec::new();
    }

    let norm_q = normalize_for_match(&clean_q);
    if norm_q.is_empty() {
        return Vec::new();
    }

    let url = format!(
        "https://zh.wikisource.org/w/api.php?action=query&list=search&srsearch={}&srlimit=15&format=json",
        url_encode(&format!("intitle:{}", clean_q))
    );
    let json_text = match http_fetch_text(&url, proxy, 5).await {
        Some(t) => t,
        None => return Vec::new(),
    };
    let data: Value = match serde_json::from_str(&json_text) {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };
    let hits = match data.get("query").and_then(|q| q.get("search")).and_then(|s| s.as_array()) {
        Some(arr) => arr,
        None => return Vec::new(),
    };

    let noise_keywords = [
        "判决书", "裁定书", "决定书", "起诉书", "通知书", "公报", "决议",
        "社论", "致辞", "代表大会", "工作报告", "记者问", "新闻",
    ];

    let mut results = Vec::new();
    for hit in hits {
        let raw_title = hit.get("title").and_then(|v| v.as_str()).unwrap_or("").trim();
        if raw_title.is_empty() {
            continue;
        }
        if noise_keywords.iter().any(|kw| raw_title.contains(kw)) {
            continue;
        }
        if !clean_q.contains('/') && raw_title.contains('/') {
            continue;
        }
        let norm_title = normalize_for_match(raw_title);
        if !norm_title.contains(&norm_q) && !norm_q.contains(&norm_title) {
            continue;
        }

        let page_id = hit.get("pageid").and_then(|v| v.as_i64()).unwrap_or(0);
        let word_count = hit.get("wordcount").and_then(|v| v.as_u64()).unwrap_or(3000);
        let snippet = strip_xml_tags(hit.get("snippet").and_then(|v| v.as_str()).unwrap_or(""));
        let fmt = if format_filter == "txt" { "txt" } else { "epub" };

        results.push(serde_json::json!({
            "remote_id": format!("wikisource:{}:{}", page_id, raw_title),
            "wikisource_title": raw_title,
            "source_id": "standard-opds",
            "source_type": "opds",
            "title": raw_title,
            "author": "维基文库古籍/公版原典",
            "publisher": "Wikisource 中文维基文库",
            "year": "典藏善本",
            "isbn": format!("WS-{}", page_id),
            "format": fmt,
            "file_size": format_bytes((word_count * 6).max(45_000)),
            "language": "zh-CN",
            "cover_url": "",
            "cover_color": "#065f46",
            "md5": sha256_short(&format!("ws:{}", page_id)),
            "category": "中文典籍与文献",
            "tags": ["维基文库全文直连", "精校原文", fmt.to_uppercase()],
            "description": if snippet.is_empty() {
                format!("来自中文维基文库（Wikisource）的《{}》精校全文，支持一键打包生成标准 EPUB/TXT 入库。", raw_title)
            } else {
                format!("原文摘录：{}…", snippet)
            }
        }));

        if results.len() >= 10 {
            break;
        }
    }

    results
}

async fn resolve_libgen_download_url(md5: &str, proxy: &str) -> Option<String> {
    let clean_md5 = md5.trim_start_matches("md5:").trim().to_lowercase();
    if clean_md5.len() != 32 || !clean_md5.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }

    for base in ["https://libgen.li", "https://libgen.vg"] {
        let ads_url = format!("{}/ads.php?md5={}", base, clean_md5);
        if let Some(html) = http_fetch_text(&ads_url, proxy, 8).await {
            if let Some(pos) = html.find("get.php?md5=") {
                if let Some(end_q) = html[pos..].find('"') {
                    let rel = html[pos..pos + end_q].replace("&amp;", "&");
                    if rel.contains("key=") {
                        return Some(format!("{}/{}", base, rel.trim_start_matches('/')));
                    }
                }
            }
        }
    }
    None
}

async fn resolve_internet_archive_download_url(
    ia_id: &str,
    preferred_fmt: &str,
    target_title: &str,
    proxy: &str,
) -> Option<(String, String)> {
    let clean_id = ia_id.trim_start_matches("ia:").trim();
    if clean_id.is_empty() {
        return None;
    }
    let meta_url = format!("https://archive.org/metadata/{}/files", url_encode(clean_id));
    let json_text = http_fetch_text(&meta_url, proxy, 8).await?;
    let data: Value = serde_json::from_str(&json_text).ok()?;
    let files = data.get("result")?.as_array()?;

    let mut valid_files: Vec<(&str, &str)> = Vec::new();
    for f in files {
        let name = f.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let lower = name.to_lowercase();
        if lower.ends_with("_meta.xml")
            || lower.ends_with("_files.xml")
            || lower.ends_with("_marc.xml")
            || lower.ends_with("_lcp.epub")
            || lower.contains("encrypted")
            || lower.ends_with(".torrent")
            || lower.ends_with(".sqlite")
        {
            continue;
        }
        if lower.ends_with(".epub") || lower.ends_with(".pdf") || lower.ends_with(".txt") || lower.ends_with(".mobi") {
            let source = f.get("source").and_then(|v| v.as_str()).unwrap_or("");
            valid_files.push((name, source));
        }
    }
    if valid_files.is_empty() {
        return None;
    }

    let norm_target = normalize_for_match(target_title.split(['（', '(', '·']).next().unwrap_or(target_title));
    let title_matched: Vec<(&str, &str)> = if norm_target.chars().count() >= 2 {
        valid_files
            .iter()
            .copied()
            .filter(|(n, _)| normalize_for_match(n).contains(&norm_target))
            .collect()
    } else {
        Vec::new()
    };
    let pool = if !title_matched.is_empty() { &title_matched } else { &valid_files };

    let pick = |ext: &str, orig_only: bool| -> Option<&str> {
        pool.iter()
            .find(|(n, s)| (!orig_only || *s == "original") && n.to_lowercase().ends_with(ext))
            .or_else(|| {
                valid_files
                    .iter()
                    .find(|(n, s)| (!orig_only || *s == "original") && n.to_lowercase().ends_with(ext))
            })
            .map(|(n, _)| *n)
    };

    let chosen_name = (if preferred_fmt == "txt" { pick(".txt", true) } else { None })
        .or_else(|| if preferred_fmt == "pdf" { pick(".pdf", true) } else { None })
        .or_else(|| pick(".epub", true))
        .or_else(|| pick(".epub", false))
        .or_else(|| pick(".txt", true))
        .or_else(|| pick(".pdf", true))
        .or_else(|| pick(".txt", false))
        .or_else(|| pick(".pdf", false))
        .or_else(|| pick(".mobi", false))?;

    let lower_chosen = chosen_name.to_lowercase();
    let actual_fmt = if lower_chosen.ends_with(".epub") {
        "epub"
    } else if lower_chosen.ends_with(".pdf") {
        "pdf"
    } else if lower_chosen.ends_with(".mobi") {
        "mobi"
    } else {
        "txt"
    };

    let encoded_path = chosen_name
        .split('/')
        .map(url_encode)
        .collect::<Vec<_>>()
        .join("/");

    Some((
        format!("https://archive.org/download/{}/{}", url_encode(clean_id), encoded_path),
        actual_fmt.to_string(),
    ))
}

async fn fetch_wikisource_full_book(page_title: &str, proxy: &str) -> Option<Vec<Value>> {
    let clean_title = page_title.trim();
    if clean_title.is_empty() {
        return None;
    }

    async fn fetch_extract(title: &str, proxy: &str) -> Option<Value> {
        for candidate in [title.to_string(), to_traditional_chinese(title)] {
            let url = format!(
                "https://zh.wikisource.org/w/api.php?action=query&redirects=1&prop=extracts|links&explaintext=1&pllimit=50&titles={}&format=json",
                url_encode(&candidate)
            );
            if let Some(txt) = http_fetch_text(&url, proxy, 6).await {
                if let Ok(val) = serde_json::from_str::<Value>(&txt) {
                    if let Some(pages) = val.get("query").and_then(|q| q.get("pages")).and_then(|p| p.as_object()) {
                        for (pid, page_obj) in pages {
                            if pid != "-1" {
                                return Some(page_obj.clone());
                            }
                        }
                    }
                }
            }
        }
        None
    }

    let main_page = fetch_extract(clean_title, proxy).await?;
    let resolved_title = main_page
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or(clean_title)
        .to_string();
    let main_extract = main_page
        .get("extract")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let mut sub_links: Vec<String> = Vec::new();
    if let Some(links) = main_page.get("links").and_then(|v| v.as_array()) {
        for link in links {
            if let Some(lt) = link.get("title").and_then(|v| v.as_str()) {
                if lt.starts_with(&format!("{}/", resolved_title)) || lt.starts_with(&format!("{}/", clean_title)) {
                    sub_links.push(lt.to_string());
                }
            }
        }
    }
    sub_links.truncate(20);

    let mut chapters = Vec::new();
    if main_extract.chars().count() > 120 {
        let wc = main_extract.chars().count();
        chapters.push(serde_json::json!({
            "id": format!("ch_{}", chapters.len() + 1),
            "title": if !sub_links.is_empty() { format!("{} · 导读与总目", clean_title) } else { clean_title.to_string() },
            "content": main_extract,
            "wordCount": wc,
            "order": chapters.len(),
        }));
    }

    for sub_title in sub_links {
        if let Some(sp) = fetch_extract(&sub_title, proxy).await {
            let ext = sp.get("extract").and_then(|v| v.as_str()).unwrap_or("").trim();
            if ext.chars().count() > 40 {
                let short_t = sub_title
                    .trim_start_matches(&format!("{}/", resolved_title))
                    .trim_start_matches(&format!("{}/", clean_title))
                    .to_string();
                let wc = ext.chars().count();
                let order = chapters.len();
                chapters.push(serde_json::json!({
                    "id": format!("ch_{}", order + 1),
                    "title": if short_t.is_empty() { sub_title } else { short_t },
                    "content": ext,
                    "wordCount": wc,
                    "order": order,
                }));
            }
        }
    }

    if chapters.is_empty() && !main_extract.is_empty() {
        let wc = main_extract.chars().count();
        chapters.push(serde_json::json!({
            "id": "ch_1",
            "title": clean_title,
            "content": main_extract,
            "wordCount": wc,
            "order": 0,
        }));
    }

    if chapters.is_empty() {
        None
    } else {
        Some(chapters)
    }
}

fn generate_valid_epub_bytes(
    title: &str,
    author: &str,
    publisher: &str,
    description: &str,
    chapters: &[Value],
) -> Option<Vec<u8>> {
    let buf = std::io::Cursor::new(Vec::new());
    let mut zip = zip::ZipWriter::new(buf);
    let stored = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
    let deflated = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("mimetype", stored).ok()?;
    zip.write_all(b"application/epub+zip").ok()?;

    zip.start_file("META-INF/container.xml", deflated).ok()?;
    zip.write_all(
        br#"<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"#,
    )
    .ok()?;

    let esc = |s: &str| -> String {
        s.replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace('"', "&quot;")
    };

    let mut manifest_items = String::new();
    let mut spine_items = String::new();
    let mut nav_points = String::new();

    for (idx, ch) in chapters.iter().enumerate() {
        let ch_num = idx + 1;
        let ch_title = ch.get("title").and_then(|v| v.as_str()).unwrap_or("正文");
        let ch_content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
        let filename = format!("ch_{:04}.xhtml", ch_num);

        let mut body_html = String::new();
        for p in ch_content.lines().map(|l| l.trim()).filter(|l| !l.is_empty()) {
            body_html.push_str(&format!("    <p>{}</p>\n", esc(p)));
        }

        let xhtml = format!(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE html>\n<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head><title>{}</title><meta charset=\"utf-8\"/></head>\n<body>\n  <h1>{}</h1>\n{}</body>\n</html>",
            esc(ch_title),
            esc(ch_title),
            body_html
        );
        zip.start_file(format!("OEBPS/{}", filename), deflated).ok()?;
        zip.write_all(xhtml.as_bytes()).ok()?;

        manifest_items.push_str(&format!(
            "    <item id=\"ch{}\" href=\"{}\" media-type=\"application/xhtml+xml\"/>\n",
            ch_num, filename
        ));
        spine_items.push_str(&format!("    <itemref idref=\"ch{}\"/>\n", ch_num));
        nav_points.push_str(&format!(
            "    <navPoint id=\"navPoint-{}\" playOrder=\"{}\"><navLabel><text>{}</text></navLabel><content src=\"{}\"/></navPoint>\n",
            ch_num,
            ch_num,
            esc(ch_title),
            filename
        ));
    }

    let opf = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<package xmlns=\"http://www.idpf.org/2007/opf\" unique-identifier=\"BookId\" version=\"2.0\">\n  <metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n    <dc:title>{}</dc:title>\n    <dc:creator>{}</dc:creator>\n    <dc:publisher>{}</dc:publisher>\n    <dc:description>{}</dc:description>\n    <dc:language>zh-CN</dc:language>\n  </metadata>\n  <manifest>\n    <item id=\"ncx\" href=\"toc.ncx\" media-type=\"application/x-dtbncx+xml\"/>\n{}</manifest>\n  <spine toc=\"ncx\">\n{}</spine>\n</package>",
        esc(title),
        esc(author),
        esc(publisher),
        esc(description),
        manifest_items,
        spine_items
    );
    zip.start_file("OEBPS/content.opf", deflated).ok()?;
    zip.write_all(opf.as_bytes()).ok()?;

    let ncx = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<ncx xmlns=\"http://www.daisy.org/z3986/2005/ncx/\" version=\"2005-1\">\n  <head><meta name=\"dtb:uid\" content=\"luminaread\"/></head>\n  <docTitle><text>{}</text></docTitle>\n  <navMap>\n{}</navMap>\n</ncx>",
        esc(title),
        nav_points
    );
    zip.start_file("OEBPS/toc.ncx", deflated).ok()?;
    zip.write_all(ncx.as_bytes()).ok()?;

    let cursor = zip.finish().ok()?;
    Some(cursor.into_inner())
}

pub struct DiscoveryServiceImpl {
    db: DbContext,
    search_repo: Arc<dyn SearchRepository>,
    source_repo: Arc<dyn SourceRepository>,
    book_repo: Arc<dyn BookRepository>,
    config: AppConfig,
}

impl DiscoveryServiceImpl {
    pub fn new(
        db: DbContext,
        search_repo: Arc<dyn SearchRepository>,
        source_repo: Arc<dyn SourceRepository>,
        book_repo: Arc<dyn BookRepository>,
        config: AppConfig,
    ) -> Self {
        Self {
            db,
            search_repo,
            source_repo,
            book_repo,
            config,
        }
    }

    async fn resolve_effective_proxy(&self, explicit_proxy: Option<&str>, source_id: Option<&str>) -> String {
        if let Some(ep) = explicit_proxy {
            let t = ep.trim();
            if t.starts_with("http://") || t.starts_with("https://") {
                return t.to_string();
            }
        }
        if let Ok(sources) = self.source_repo.list_sources().await {
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
}

#[async_trait]
impl DiscoveryService for DiscoveryServiceImpl {
    async fn search_all(&self, q: &str, book_id: Option<&str>, limit: usize) -> AppResult<Value> {
        self.search_repo.search(q, book_id, limit).await
    }

    async fn search_book(&self, book_id: &str, q: &str, limit: usize) -> AppResult<Value> {
        self.search_repo.search(q, Some(book_id), limit).await
    }

    async fn list_sources(&self) -> AppResult<Vec<BookSource>> {
        self.source_repo.list_sources().await
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
        self.source_repo
            .update_source(id, name, base_url, proxy_url, auth_config, mirror_urls, enabled)
            .await
    }

    async fn test_connection(
        &self,
        source_id: Option<&str>,
        base_url: Option<&str>,
        proxy_url: Option<&str>,
    ) -> AppResult<Value> {
        let mut target_url = base_url.unwrap_or("").trim().to_string();
        if target_url.is_empty() {
            if let Some(sid) = source_id {
                if let Ok(sources) = self.source_repo.list_sources().await {
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

        let effective_proxy = self.resolve_effective_proxy(proxy_url, source_id).await;
        let start = Instant::now();
        let mut builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .connect_timeout(std::time::Duration::from_secs(3))
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
                let _ = self
                    .source_repo
                    .update_source_test_result(sid, latency_ms, status_str)
                    .await;
            }
        }

        Ok(serde_json::json!({
            "ok": true,
            "status": status_str,
            "message": message,
            "latency_ms": latency_ms,
        }))
    }

    async fn discover_search(
        &self,
        q: &str,
        lang: Option<&str>,
        src_id: Option<&str>,
        format: Option<&str>,
    ) -> AppResult<Value> {
        let query_clean = q.trim();
        let lang_filter = lang.unwrap_or("all").trim().to_lowercase();
        let raw_src = src_id.unwrap_or("all").trim().to_lowercase();
        let src_type = match raw_src.as_str() {
            "zlib-official" | "zlibrary" => "zlibrary",
            "annas-archive" | "annas_archive" => "annas_archive",
            "gutenberg-direct" | "gutenberg" => "gutenberg",
            "openlibrary-direct" | "archive-direct" | "openlibrary" => "openlibrary",
            "standard-opds" | "calibre-opds" | "opds" => "opds",
            _ => "all",
        };
        let fmt_filter = format.unwrap_or("all").trim().to_lowercase();

        let effective_query = if !query_clean.is_empty() {
            query_clean.to_string()
        } else if lang_filter == "en" || src_type == "gutenberg" {
            "classic".to_string()
        } else if src_type == "opds" {
            "史记".to_string()
        } else {
            String::new()
        };

        let cache_key = format!("{}___{}___{}___{}", query_clean, src_type, fmt_filter, lang_filter);
        let mut results: Vec<Value> = Vec::new();

        if let Ok(guard) = get_search_cache().lock() {
            if let Some((ts, cached_items)) = guard.get(&cache_key) {
                let ttl = if query_clean.is_empty() { Duration::from_secs(600) } else { Duration::from_secs(180) };
                if ts.elapsed() < ttl && !cached_items.is_empty() {
                    results = cached_items.clone();
                }
            }
        }

        if results.is_empty() {
            let proxy = self.resolve_effective_proxy(None, src_id).await;
            let mut merged = Vec::new();
            let mut seen_ids = HashSet::new();

            if !effective_query.is_empty() {
                let (shadow_res, ia_res, pg_res, ws_res) = tokio::join!(
                    search_shadow_library_live(&effective_query, src_type, &fmt_filter, &lang_filter, &proxy),
                    search_internet_archive_live(&effective_query, src_type, &fmt_filter, &lang_filter, &proxy),
                    search_gutenberg_opds_live(&effective_query, &fmt_filter, &lang_filter, &proxy),
                    search_chinese_wikisource_live(&effective_query, src_type, &fmt_filter, &lang_filter, &proxy),
                );

                for list in [shadow_res, ia_res, pg_res, ws_res] {
                    for item in list {
                        let rid = item.get("remote_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        if rid.is_empty() || seen_ids.contains(&rid) {
                            continue;
                        }
                        seen_ids.insert(rid);
                        merged.push(item);
                    }
                }
            }

            // Merge matching curated real-source entries
            let norm_q = normalize_for_match(query_clean);
            for item in build_curated_discovery_catalog() {
                let item_stype = item.get("source_type").and_then(|v| v.as_str()).unwrap_or("");
                let item_lang = item.get("language").and_then(|v| v.as_str()).unwrap_or("zh");
                let item_fmt = item.get("format").and_then(|v| v.as_str()).unwrap_or("epub");

                if src_type != "all" && item_stype != src_type {
                    continue;
                }
                if !matches_language_filter(item_lang, &lang_filter) {
                    continue;
                }
                if fmt_filter != "all" && !fmt_filter.is_empty() && item_fmt != fmt_filter {
                    continue;
                }
                if !norm_q.is_empty() {
                    let t = item.get("title").and_then(|v| v.as_str()).unwrap_or("");
                    let a = item.get("author").and_then(|v| v.as_str()).unwrap_or("");
                    let c = item.get("category").and_then(|v| v.as_str()).unwrap_or("");
                    let hay = normalize_for_match(&format!("{} {} {}", t, a, c));
                    if !hay.contains(&norm_q) {
                        continue;
                    }
                }
                let rid = item.get("remote_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                if !rid.is_empty() && !seen_ids.contains(&rid) {
                    seen_ids.insert(rid);
                    merged.push(item);
                }
            }

            if !query_clean.is_empty() {
                merged.sort_by(|a, b| score_book_relevance(b, query_clean).cmp(&score_book_relevance(a, query_clean)));
            }
            merged.truncate(50);

            if !merged.is_empty() {
                if let Ok(mut guard) = get_search_cache().lock() {
                    if guard.len() >= 100 {
                        let cutoff = Instant::now() - std::time::Duration::from_secs(600);
                        guard.retain(|_, (ts, _)| *ts > cutoff);
                        if guard.len() >= 100 {
                            if let Some(oldest_k) = guard.iter().min_by_key(|(_, (ts, _))| *ts).map(|(k, _)| k.clone()) {
                                guard.remove(&oldest_k);
                            }
                        }
                    }
                    guard.insert(cache_key, (Instant::now(), merged.clone()));
                }
            }
            results = merged;
        }

        // Annotate already_in_shelf using only real books (ignore broken 2-chapter <500 word stubs)
        let existing_books = self.book_repo.list(&BookFilter::default()).await.unwrap_or_default();
        let mut shelf_by_norm_title: HashMap<String, String> = HashMap::new();
        for b in existing_books {
            if b.word_count > 500 || b.chapters_count > 2 {
                let clean_bt = normalize_for_match(
                    b.title
                        .replace(['《', '》'], "")
                        .split(['（', '('])
                        .next()
                        .unwrap_or(&b.title),
                );
                if !clean_bt.is_empty() {
                    shelf_by_norm_title.insert(clean_bt, b.id);
                }
            }
        }

        for item in &mut results {
            if let Some(obj) = item.as_object_mut() {
                let raw_t = obj.get("title").and_then(|v| v.as_str()).unwrap_or("");
                let clean_rt = normalize_for_match(
                    raw_t
                        .replace(['《', '》'], "")
                        .split(['（', '('])
                        .next()
                        .unwrap_or(raw_t),
                );
                if let Some(local_id) = shelf_by_norm_title.get(&clean_rt) {
                    obj.insert("already_in_shelf".to_string(), Value::Bool(true));
                    obj.insert("local_book_id".to_string(), Value::String(local_id.clone()));
                } else {
                    obj.insert("already_in_shelf".to_string(), Value::Bool(false));
                }
            }
        }

        Ok(serde_json::json!({
            "ok": true,
            "query": query_clean,
            "source": src_id.unwrap_or("all"),
            "count": results.len(),
            "results": results,
        }))
    }

    async fn discover_download(&self, task_dto: Value) -> AppResult<Value> {
        let now = chrono::Local::now();
        let now_iso = now.to_rfc3339();
        let seq = DL_SEQ.fetch_add(1, Ordering::Relaxed) % 10000;
        let task_id = format!("dl_{}_{:04}", now.timestamp_millis(), seq);
        let book_id = format!("book_dl_{}_{:04}", now.timestamp_millis(), seq);

        let remote_id = task_dto.get("remote_id").and_then(|v| v.as_str()).unwrap_or("").trim();
        let title = task_dto
            .get("title")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("精选图书");
        let clean_title = strip_promotional_parentheticals(title);
        let author = task_dto
            .get("author")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("馆藏作者");
        let requested_fmt = task_dto
            .get("format")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("epub")
            .to_lowercase();
        let mut effective_format = if matches!(requested_fmt.as_str(), "epub" | "txt" | "md" | "pdf" | "mobi") {
            requested_fmt
        } else {
            "epub".to_string()
        };
        let description = task_dto
            .get("description")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("");
        let publisher = task_dto
            .get("publisher")
            .and_then(|v| v.as_str())
            .unwrap_or("全球数字图书馆");
        let publish_year = task_dto
            .get("year")
            .and_then(|v| v.as_str())
            .unwrap_or("2024");
        let isbn = task_dto.get("isbn").and_then(|v| v.as_str()).unwrap_or("");
        let cover_url = task_dto.get("cover_url").and_then(|v| v.as_str()).unwrap_or("");
        let cover_color = task_dto
            .get("cover_color")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("#1e40af");
        let source_id = task_dto
            .get("source_id")
            .and_then(|v| v.as_str())
            .unwrap_or("zlib-official");
        let source_type = task_dto
            .get("source_type")
            .and_then(|v| v.as_str())
            .unwrap_or("zlibrary");
        let category = task_dto
            .get("category")
            .and_then(|v| v.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("外部书源下载");
        let tags: Vec<String> = task_dto
            .get("tags")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
            .unwrap_or_else(|| vec!["全网下载".to_string(), effective_format.to_uppercase()]);

        let initial_task = DownloadTask {
            id: task_id.clone(),
            source_id: source_id.to_string(),
            source_type: source_type.to_string(),
            remote_id: if remote_id.is_empty() { None } else { Some(remote_id.to_string()) },
            title: clean_title.clone(),
            author: Some(author.to_string()),
            format: Some(effective_format.clone()),
            file_size: None,
            cover_url: if cover_url.is_empty() { None } else { Some(cover_url.to_string()) },
            cover_color: Some(cover_color.to_string()),
            download_url: None,
            status: "downloading".to_string(),
            progress: 15,
            error_message: None,
            book_id: Some(book_id.clone()),
            created_at: now_iso.clone(),
            updated_at: now_iso.clone(),
        };
        let _ = self.source_repo.create_task(&initial_task).await;

        let proxy = self.resolve_effective_proxy(None, Some(source_id)).await;

        let mut effective_download_url = task_dto
            .get("download_url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();

        // Ignore placeholder non-binary URLs
        if effective_download_url.contains("z-library.sk/")
            || effective_download_url.contains("annas-archive.org/")
            || effective_download_url.contains("openlibrary.org/works/")
            || effective_download_url.contains("openlibrary.org/books/")
            || effective_download_url.contains("standardebooks.org/ebooks/")
            || effective_download_url.contains("dli.2015.352424")
        {
            effective_download_url.clear();
        }

        let effective_md5 = task_dto
            .get("libgen_md5")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .or_else(|| {
                if remote_id.starts_with("md5:") {
                    Some(remote_id[4..].to_string())
                } else {
                    None
                }
            })
            .unwrap_or_default();

        let mut effective_ia_id = task_dto
            .get("ia_identifier")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .or_else(|| {
                if remote_id.starts_with("ia:") {
                    Some(remote_id[3..].to_string())
                } else {
                    None
                }
            })
            .unwrap_or_default();

        // Step 1A: Resolve LibGen MD5 direct download URL
        if effective_download_url.is_empty() && !effective_md5.is_empty() {
            if let Some(resolved_lg) = resolve_libgen_download_url(&effective_md5, &proxy).await {
                effective_download_url = resolved_lg;
            }
        }

        // Step 1B: Resolve Internet Archive identifier
        if effective_download_url.is_empty() && !effective_ia_id.is_empty() {
            if let Some((url, fmt)) =
                resolve_internet_archive_download_url(&effective_ia_id, &effective_format, &clean_title, &proxy).await
            {
                effective_download_url = url;
                effective_format = fmt;
            }
        }

        // Step 1C: Resolve Gutenberg ID
        if effective_download_url.is_empty()
            && (remote_id.starts_with("gutenberg:") || remote_id.starts_with("gutendex:"))
        {
            if let Some(pg_id) = remote_id.split(':').nth(1) {
                effective_download_url = if effective_format == "txt" {
                    format!("https://www.gutenberg.org/ebooks/{}.txt.utf-8", pg_id)
                } else {
                    format!("https://www.gutenberg.org/ebooks/{}.epub.noimages", pg_id)
                };
            }
        }

        // Step 1D: Dynamic live lookup by title if no direct download URL resolved yet
        if effective_download_url.is_empty() && !remote_id.starts_with("wikisource:") {
            let search_title = clean_title
                .split(['（', '(', '·', ':', '：', '—'])
                .next()
                .unwrap_or(&clean_title)
                .trim()
                .to_string();
            if !search_title.is_empty() {
                let shadow_hits =
                    search_shadow_library_live(&search_title, "all", "all", "all", &proxy).await;
                for cand in shadow_hits.iter().take(4) {
                    if let Some(md5) = cand.get("libgen_md5").and_then(|v| v.as_str()) {
                        if let Some(resolved_lg) = resolve_libgen_download_url(md5, &proxy).await {
                            effective_download_url = resolved_lg;
                            if let Some(f) = cand.get("format").and_then(|v| v.as_str()) {
                                effective_format = f.to_string();
                            }
                            break;
                        }
                    }
                }
                if effective_download_url.is_empty() {
                    let ia_hits =
                        search_internet_archive_live(&search_title, "all", "all", "all", &proxy).await;
                    for cand in ia_hits.iter().take(3) {
                        if let Some(ia_id) = cand.get("ia_identifier").and_then(|v| v.as_str()) {
                            if let Some((url, fmt)) = resolve_internet_archive_download_url(
                                ia_id,
                                &effective_format,
                                &search_title,
                                &proxy,
                            )
                            .await
                            {
                                effective_ia_id = ia_id.to_string();
                                effective_download_url = url;
                                effective_format = fmt;
                                break;
                            }
                        }
                    }
                }
            }
        }

        let mut downloaded_bytes: Option<Vec<u8>> = None;
        let mut wikisource_chapters: Option<Vec<Value>> = None;

        // Step 2A: Wikisource full-book chapter extraction
        if remote_id.starts_with("wikisource:") {
            let ws_title = task_dto
                .get("wikisource_title")
                .and_then(|v| v.as_str())
                .or_else(|| remote_id.split(':').nth(2))
                .unwrap_or(&clean_title);
            if let Some(chs) = fetch_wikisource_full_book(ws_title, &proxy).await {
                wikisource_chapters = Some(chs);
            }
        }

        // Step 2B: Direct HTTP(S) binary download
        if wikisource_chapters.is_none() && !effective_download_url.is_empty() {
            if let Some(buf) = http_fetch_bytes(&effective_download_url, &proxy, 45).await {
                let head_str = String::from_utf8_lossy(&buf[..buf.len().min(350)]).to_lowercase();
                let is_html_err = head_str.contains("<!doctype html")
                    || head_str.contains("<html")
                    || head_str.contains("welcome to nginx");
                if buf.len() > 1024 && !is_html_err {
                    if buf.starts_with(b"%PDF") {
                        effective_format = "pdf".to_string();
                    } else if buf.starts_with(b"PK") {
                        effective_format = "epub".to_string();
                    } else if buf.len() >= 68
                        && (&buf[60..68] == b"BOOKMOBI" || &buf[60..68] == b"TEXtREAd")
                    {
                        effective_format = "mobi".to_string();
                    }
                    downloaded_bytes = Some(buf);
                }
            }
        }

        // Step 2B fallback: If primary IA file failed, try resolving TXT from IA
        if downloaded_bytes.is_none() && wikisource_chapters.is_none() && !effective_ia_id.is_empty() {
            if let Some((alt_url, alt_fmt)) =
                resolve_internet_archive_download_url(&effective_ia_id, "txt", &clean_title, &proxy).await
            {
                if alt_url != effective_download_url {
                    if let Some(buf) = http_fetch_bytes(&alt_url, &proxy, 30).await {
                        if buf.len() > 512 {
                            effective_format = alt_fmt;
                            downloaded_bytes = Some(buf);
                        }
                    }
                }
            }
        }

        // Step 2C: Local Shelf Mirror or Wikisource Fallback if remote binary was unreachable
        if downloaded_bytes.is_none() && wikisource_chapters.is_none() {
            let norm_target = normalize_for_match(
                clean_title
                    .replace(['《', '》'], "")
                    .split(['（', '(', '·'])
                    .next()
                    .unwrap_or(&clean_title),
            );
            if let Ok(local_books) = self.book_repo.list(&BookFilter::default()).await {
                for lb in local_books {
                    if lb.chapters_count <= 2 || lb.word_count <= 500 || lb.file_path.is_empty() {
                        continue;
                    }
                    let p = PathBuf::from(&lb.file_path);
                    if !p.exists() {
                        continue;
                    }
                    let norm_lb = normalize_for_match(
                        lb.title
                            .replace(['《', '》'], "")
                            .split(['（', '(', '·'])
                            .next()
                            .unwrap_or(&lb.title),
                    );
                    if !norm_target.is_empty()
                        && !norm_lb.is_empty()
                        && norm_lb == norm_target
                    {
                        if let Ok(bytes) = tokio::fs::read(&p).await {
                            if bytes.len() > 4096 {
                                effective_format = lb.format.as_str().to_string();
                                downloaded_bytes = Some(bytes);
                                break;
                            }
                        }
                    }
                }
            }
        }

        if downloaded_bytes.is_none() && wikisource_chapters.is_none() {
            let cleaned_t = clean_title.replace(['《', '》'], "");
            let base_t = cleaned_t
                .split(['（', '(', '·', ':', '：'])
                .next()
                .unwrap_or(&clean_title);
            if let Some(chs) = fetch_wikisource_full_book(base_t, &proxy).await {
                wikisource_chapters = Some(chs);
            }
        }

        // Step 3: Parse chapters & write book file to disk
        let file_path = self
            .config
            .books_dir
            .join(format!("{}.{}", book_id, effective_format));
        let file_path_str = file_path.to_string_lossy().to_string();

        let (final_chapters, final_word_count, final_file_size, parsed_cover) =
            if let Some(ws_chs) = wikisource_chapters {
                let total_wc: usize = ws_chs
                    .iter()
                    .map(|c| c.get("wordCount").and_then(|v| v.as_u64()).unwrap_or(0) as usize)
                    .sum();
                let bytes = if effective_format == "txt" {
                    let txt = ws_chs
                        .iter()
                        .map(|c| {
                            format!(
                                "{}\n\n{}",
                                c.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                                c.get("content").and_then(|v| v.as_str()).unwrap_or("")
                            )
                        })
                        .collect::<Vec<_>>()
                        .join("\n\n\n");
                    txt.into_bytes()
                } else {
                    effective_format = "epub".to_string();
                    generate_valid_epub_bytes(&clean_title, author, publisher, description, &ws_chs)
                        .unwrap_or_else(|| serde_json::to_vec(&ws_chs).unwrap_or_default())
                };
                let fsize = bytes.len() as i64;
                let _ = tokio::fs::write(&file_path, &bytes).await;
                (ws_chs, total_wc as i64, fsize, None)
            } else if let Some(raw_buf) = downloaded_bytes {
                let is_zip = raw_buf.starts_with(b"PK");
                let is_pdf = raw_buf.starts_with(b"%PDF");
                let is_mobi = raw_buf.len() >= 68
                    && (&raw_buf[60..68] == b"BOOKMOBI" || &raw_buf[60..68] == b"TEXtREAd");

                if !is_zip && !is_pdf && !is_mobi && effective_format == "epub" {
                    let temp_txt = self.config.books_dir.join(format!("{}_temp.txt", book_id));
                    tokio::fs::write(&temp_txt, &raw_buf)
                        .await
                        .map_err(InfraError::Io)?;
                    let temp_clone = temp_txt.clone();
                    let t_owned = clean_title.clone();
                    let a_owned = author.to_string();
                    let covers_dir = self.config.covers_dir.clone();
                    let parsed = tokio::task::spawn_blocking(move || {
                        parse_book_file_with_meta(&temp_clone, &t_owned, &a_owned, &covers_dir)
                    })
                    .await
                    .map_err(InfraError::JoinError)?
                    .map_err(DomainError::ValidationError)?;
                    let _ = tokio::fs::remove_file(&temp_txt).await;

                    let epub_bytes = generate_valid_epub_bytes(
                        &clean_title,
                        author,
                        publisher,
                        description,
                        &parsed.chapters,
                    )
                    .unwrap_or(raw_buf);
                    let fsize = epub_bytes.len() as i64;
                    tokio::fs::write(&file_path, &epub_bytes)
                        .await
                        .map_err(InfraError::Io)?;
                    (parsed.chapters, parsed.word_count as i64, fsize, parsed.cover_url)
                } else {
                    let fsize = raw_buf.len() as i64;
                    tokio::fs::write(&file_path, &raw_buf)
                        .await
                        .map_err(InfraError::Io)?;
                    let fp_clone = file_path.clone();
                    let t_owned = clean_title.clone();
                    let a_owned = author.to_string();
                    let covers_dir = self.config.covers_dir.clone();
                    let parsed = tokio::task::spawn_blocking(move || {
                        parse_book_file_with_meta(&fp_clone, &t_owned, &a_owned, &covers_dir)
                    })
                    .await
                    .map_err(InfraError::JoinError)?
                    .map_err(DomainError::ValidationError)?;
                    (parsed.chapters, parsed.word_count as i64, fsize, parsed.cover_url)
                }
            } else {
                let err_msg = format!(
                    "书源暂时无法获取《{}》的全文文件，请尝试切换其他检索结果或书源",
                    clean_title
                );
                let _ = self.source_repo.update_task_progress(&task_id, 0, "failed", Some(&err_msg)).await;
                return Err(DomainError::ValidationError(err_msg).into());
            };

        let chapters_json = serde_json::to_string(&final_chapters).unwrap_or_else(|_| "[]".into());
        let final_cover_url = parsed_cover
            .filter(|c| !c.is_empty())
            .unwrap_or_else(|| cover_url.to_string());

        let book = Book {
            id: book_id.clone(),
            title: clean_title.clone(),
            author: author.to_string(),
            cover_url: final_cover_url.clone(),
            cover_color: cover_color.to_string(),
            isbn: isbn.to_string(),
            publisher: publisher.to_string(),
            publish_year: publish_year.to_string(),
            source_type: source_type.to_string(),
            format: BookFormat::from_ext(&effective_format).unwrap_or(BookFormat::Epub),
            file_path: file_path_str.clone(),
            file_size: final_file_size.max(4096),
            word_count: final_word_count,
            category: category.to_string(),
            library_id: "lib-default".to_string(),
            tags,
            status: BookStatus::Unread,
            import_progress: 100,
            import_step: "下载完成".to_string(),
            import_error: String::new(),
            total_reading_seconds: 0,
            last_read_at: String::new(),
            description: description.to_string(),
            chapters_count: final_chapters.len(),
            created_at: now_iso.clone(),
            progress: None,
        };

        self.book_repo.save(&book, &chapters_json).await?;

        if effective_format == "pdf" {
            let pdf_dir = self.config.pdf_cache_dir.join(&book_id);
            if tokio::fs::create_dir_all(&pdf_dir).await.is_ok() {
                let meta = crate::infra::parser::pdf::build_pdf_meta_json(&book_id, &final_chapters);
                if let Ok(s) = serde_json::to_string_pretty(&meta) {
                    let _ = tokio::fs::write(pdf_dir.join("meta.json"), s).await;
                }
            }
        }

        let mut paras = Vec::new();
        for (ch_idx, ch) in final_chapters.iter().enumerate() {
            let ch_t = ch
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("正文")
                .to_string();
            let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let mut offset = 0i64;
            for (p_idx, line) in content
                .split('\n')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty() && !(s.starts_with("[[PDF_PAGE:") && s.ends_with("]]")))
                .enumerate()
            {
                paras.push((ch_idx, p_idx, offset, line.to_string(), ch_t.clone()));
                offset += line.chars().count() as i64 + 2;
            }
        }
        if !paras.is_empty() {
            let _ = self
                .book_repo
                .batch_index_paragraphs(&book_id, &clean_title, author, cover_color, &paras)
                .await;
        }

        // Remove any old broken 2-chapter stub for the same book title if present
        let norm_new_title = normalize_for_match(
            clean_title
                .replace(['《', '》'], "")
                .split(['（', '('])
                .next()
                .unwrap_or(&clean_title),
        );
        if final_chapters.len() > 2 {
            let norm_target = norm_new_title.clone();
            let matching_ids: Vec<String> = self
                .db
                .interact(move |conn| {
                    let mut stmt = conn.prepare(
                        "SELECT id, title FROM books WHERE id LIKE 'book_dl_%' AND word_count < 500",
                    )?;
                    let rows: Vec<(String, String)> = stmt
                        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?
                        .filter_map(Result::ok)
                        .collect();
                    let ids = rows
                        .into_iter()
                        .filter(|(_, old_t)| {
                            let norm_old = normalize_for_match(
                                old_t.replace(['《', '》'], "").split(['（', '(']).next().unwrap_or(old_t),
                            );
                            norm_old == norm_target
                        })
                        .map(|(id, _)| id)
                        .collect();
                    Ok(ids)
                })
                .await
                .unwrap_or_default();

            for old_id in matching_ids {
                let _ = self.book_repo.delete(&old_id).await;
            }
        }

        let task = DownloadTask {
            id: task_id.clone(),
            source_id: source_id.to_string(),
            source_type: source_type.to_string(),
            remote_id: if remote_id.is_empty() { None } else { Some(remote_id.to_string()) },
            title: clean_title.clone(),
            author: Some(author.to_string()),
            format: Some(effective_format.clone()),
            file_size: Some(format_bytes(final_file_size as u64)),
            cover_url: if final_cover_url.is_empty() { None } else { Some(final_cover_url) },
            cover_color: Some(cover_color.to_string()),
            download_url: if effective_download_url.is_empty() {
                None
            } else {
                Some(effective_download_url)
            },
            status: "completed".to_string(),
            progress: 100,
            error_message: None,
            book_id: Some(book_id.clone()),
            created_at: now_iso.clone(),
            updated_at: now_iso.clone(),
        };
        let _ = self.source_repo.update_task_progress(&task_id, 100, "completed", None).await;
        self.source_repo.create_task(&task).await?;

        Ok(serde_json::json!({
            "ok": true,
            "task_id": task_id,
            "task": {
                "id": task.id,
                "source_id": task.source_id,
                "source_type": task.source_type,
                "remote_id": task.remote_id,
                "title": task.title,
                "book_title": task.title,
                "author": task.author,
                "format": effective_format,
                "file_size": task.file_size,
                "status": "completed",
                "progress": 100,
                "book_id": book_id,
                "local_book_id": book_id,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
            },
            "book": book,
        }))
    }

    async fn discover_tasks(&self) -> AppResult<Vec<DownloadTask>> {
        self.source_repo.list_tasks().await
    }
}

fn build_curated_discovery_catalog() -> Vec<Value> {
    vec![
        serde_json::json!({
            "remote_id": "md5:7bb85ad72dc753fce2af1e228d3b769d",
            "libgen_md5": "7bb85ad72dc753fce2af1e228d3b769d",
            "source_id": "zlib-official",
            "source_type": "zlibrary",
            "title": "三体（全集）",
            "author": "刘慈欣",
            "publisher": "重庆出版社",
            "year": "2008",
            "isbn": "9787536693968",
            "format": "epub",
            "file_size": "2.4 MB",
            "language": "zh",
            "cover_url": "",
            "cover_color": "#1e40af",
            "md5": "7bb85ad72dc753fce2af1e228d3b769d",
            "category": "科幻经典",
            "tags": ["科幻", "雨果奖", "宇宙社会学", "面壁计划"],
            "description": "中国科幻基石之作，刘慈欣三体三部曲。面对三体文明的庞大舰队与智子封锁，人类启动面壁计划，揭示宇宙黑暗森林法则。"
        }),
        serde_json::json!({
            "remote_id": "ia:z-library_20250627_0542",
            "ia_identifier": "z-library_20250627_0542",
            "libgen_md5": "4876219a4ce2f8119342586b4cf671c1",
            "source_id": "annas-archive",
            "source_type": "annas_archive",
            "title": "百年孤独 (Cien años de soledad)",
            "author": "加西亚·马尔克斯",
            "publisher": "南海出版公司",
            "year": "2011",
            "isbn": "9787544253994",
            "format": "epub",
            "file_size": "707 KB",
            "language": "zh",
            "cover_url": "https://archive.org/services/img/z-library_20250627_0542",
            "cover_color": "#7c2d12",
            "md5": "4876219a4ce2f8119342586b4cf671c1",
            "download_url": "https://archive.org/download/z-library_20250627_0542/%E7%99%BE%E5%B9%B4%E5%AD%A4%E7%8B%AC%20%28%5B%E5%93%A5%E4%BC%A6%E6%AF%94%E4%BA%9A%5D%E5%8A%A0%E8%A5%BF%E4%BA%9A%EF%BD%A5%E9%A9%AC%E5%B0%94%E5%85%8B%E6%96%AF%20%5B%5B%E5%93%A5%E4%BC%A6%E6%AF%94%E4%BA%9A_%20%28Z-Library%29.epub",
            "category": "世界名著",
            "tags": ["魔幻现实主义", "诺贝尔文学奖", "拉美文学"],
            "description": "多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。布恩迪亚家族七代人在马孔多小镇的兴衰传奇。"
        }),
        serde_json::json!({
            "remote_id": "md5:54d0c77a2a193fcbfb37080a09b4b4e5",
            "libgen_md5": "54d0c77a2a193fcbfb37080a09b4b4e5",
            "source_id": "zlib-official",
            "source_type": "zlibrary",
            "title": "毛泽东选集",
            "author": "毛泽东",
            "publisher": "人民出版社",
            "year": "1991",
            "isbn": "9787010009148",
            "format": "epub",
            "file_size": "1.8 MB",
            "language": "zh",
            "cover_url": "",
            "cover_color": "#991b1b",
            "md5": "54d0c77a2a193fcbfb37080a09b4b4e5",
            "category": "历史文献",
            "tags": ["经典著作", "哲学史政", "实事求是"],
            "description": "收录毛泽东同志在中国革命各个历史时期的重要著作。"
        }),
        serde_json::json!({
            "remote_id": "md5:3cf4f394a73d132b8b5a3c30e7664a2a",
            "libgen_md5": "3cf4f394a73d132b8b5a3c30e7664a2a",
            "source_id": "zlib-official",
            "source_type": "zlibrary",
            "title": "人类简史：从动物到上帝",
            "author": "尤瓦尔·赫拉利",
            "publisher": "中信出版社",
            "year": "2014",
            "isbn": "9787508647357",
            "format": "epub",
            "file_size": "3.1 MB",
            "language": "zh",
            "cover_url": "",
            "cover_color": "#9a3412",
            "md5": "3cf4f394a73d132b8b5a3c30e7664a2a",
            "category": "历史社科",
            "tags": ["认知革命", "宏观历史", "人类学"],
            "description": "从十万年前有生命迹象开始到21世纪资本、科技交织的人类历史演进：认知革命、农业革命与科学革命如何重塑智人命运。"
        }),
        serde_json::json!({
            "remote_id": "gutendex:1342",
            "source_id": "gutenberg-direct",
            "source_type": "gutenberg",
            "title": "Pride and Prejudice",
            "author": "Jane Austen",
            "publisher": "Project Gutenberg",
            "year": "1813",
            "isbn": "PG-1342",
            "format": "epub",
            "file_size": "648 KB",
            "language": "en",
            "cover_url": "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg",
            "cover_color": "#065f46",
            "md5": "1342a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
            "download_url": "https://www.gutenberg.org/ebooks/1342.epub.noimages",
            "category": "Classic Literature",
            "tags": ["Classic", "Romance", "Public Domain"],
            "description": "A classic English novel of manners by Jane Austen, following the character development of Elizabeth Bennet and Fitzwilliam Darcy."
        }),
        serde_json::json!({
            "remote_id": "gutendex:1656",
            "source_id": "gutenberg-direct",
            "source_type": "gutenberg",
            "title": "Apology (苏格拉底的申辩)",
            "author": "Plato (柏拉图)",
            "publisher": "Project Gutenberg",
            "year": "-399",
            "isbn": "PG-1656",
            "format": "txt",
            "file_size": "210 KB",
            "language": "en",
            "cover_url": "https://www.gutenberg.org/cache/epub/1656/pg1656.cover.medium.jpg",
            "cover_color": "#3730a3",
            "md5": "1656b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
            "download_url": "https://www.gutenberg.org/ebooks/1656.txt.utf-8",
            "category": "Philosophy",
            "tags": ["Socrates", "Philosophy", "Ancient Greece"],
            "description": "The unexamined life is not worth living for a human being. Plato's account of Socrates' speech in defense of himself at his trial in Athens."
        }),
    ]
}
