use std::net::IpAddr;
use serde_json::Value;
use sha2::{Digest, Sha256};

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

pub fn strip_promotional_parentheticals(raw_title: &str) -> String {
    let mut out = String::new();
    let mut depth = 0i32;
    let mut group = String::new();

    for ch in raw_title.chars() {
        if matches!(ch, '（' | '(' | '【') {
            if depth == 0 { group.clear(); }
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

pub fn strip_xml_tags(s: &str) -> String {
    let without_cdata = s.replace("<![CDATA[", "").replace("]]>", "");
    let mut out = String::with_capacity(without_cdata.len());
    let mut in_tag = false;
    for ch in without_cdata.chars() {
        match ch {
            '<' => { in_tag = true; out.push(' '); }
            '>' => { in_tag = false; out.push(' '); }
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

pub fn pick_cover_color(seed: &str) -> &'static str {
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

pub fn format_bytes(bytes: u64) -> String {
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

pub fn matches_language_filter(item_lang: &str, filter_lang: &str) -> bool {
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

pub fn score_book_relevance(item: &Value, raw_query: &str) -> i64 {
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

pub fn sha256_short(input: &str) -> String {
    let mut h = Sha256::new();
    h.update(input.as_bytes());
    hex::encode(h.finalize())[..32].to_string()
}

pub fn url_encode(input: &str) -> String {
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

pub fn is_safe_external_url(raw_url: &str) -> bool {
    let u = raw_url.trim().to_ascii_lowercase();
    if !u.starts_with("http://") && !u.starts_with("https://") {
        return false;
    }
    let after_scheme = u.split("://").nth(1).unwrap_or("");
    let authority = after_scheme.split('/').next().unwrap_or("");
    // Handle userinfo: user:pass@host:port -> extract real host after last '@'
    let host_port = authority.rsplit('@').next().unwrap_or(authority);
    let host = if host_port.starts_with('[') {
        if let Some(end_bracket) = host_port.find(']') {
            &host_port[1..end_bracket]
        } else {
            return false;
        }
    } else {
        host_port.split(':').next().unwrap_or("")
    };

    if host.is_empty()
        || host == "localhost"
        || host.ends_with(".localhost")
        || host.ends_with(".local")
        || host.ends_with(".internal")
        || host.ends_with(".lan")
    {
        return false;
    }

    if let Ok(ip) = host.parse::<IpAddr>() {
        match ip {
            IpAddr::V4(ipv4) => {
                if ipv4.is_loopback()
                    || ipv4.is_private()
                    || ipv4.is_link_local()
                    || ipv4.is_broadcast()
                    || ipv4.is_unspecified()
                    || ipv4.octets()[0] == 0
                {
                    return false;
                }
            }
            IpAddr::V6(ipv6) => {
                if ipv6.is_loopback()
                    || ipv6.is_unspecified()
                    || (ipv6.segments()[0] & 0xfe00) == 0xfc00
                    || (ipv6.segments()[0] & 0xffc0) == 0xfe80
                {
                    return false;
                }
            }
        }
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_safe_external_url() {
        assert!(is_safe_external_url("https://www.gutenberg.org/ebooks/123.epub"));
        assert!(is_safe_external_url("http://example.com/book.epub"));

        // Loopback & local
        assert!(!is_safe_external_url("http://127.0.0.1/admin"));
        assert!(!is_safe_external_url("http://localhost:8080"));
        assert!(!is_safe_external_url("http://user:pass@127.0.0.1:8080/secret"));
        assert!(!is_safe_external_url("http://[::1]:8080"));

        // Private LAN
        assert!(!is_safe_external_url("http://192.168.1.1/"));
        assert!(!is_safe_external_url("http://10.0.0.1:3000/"));
        assert!(!is_safe_external_url("http://172.16.0.1/"));
        assert!(!is_safe_external_url("http://169.254.169.254/latest/meta-data/"));
        assert!(!is_safe_external_url("http://server.local/"));
        assert!(!is_safe_external_url("http://nas.internal/"));
    }
}
