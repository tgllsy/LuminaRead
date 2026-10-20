use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};

use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Message;
use crate::config::AppConfig;
use crate::error::{AppResult, DomainError, InfraError};
use crate::infra::db::DbContext;
use crate::services::traits::TtsService;
use std::collections::HashMap;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;
use tokio::sync::{Mutex, Notify};

pub struct TtsServiceImpl {
    db: DbContext,
    config: AppConfig,
    in_flight: Arc<Mutex<HashMap<String, Arc<Notify>>>>,
    http_client: reqwest::Client,
}

impl TtsServiceImpl {
    pub fn new(db: DbContext, config: AppConfig) -> Self {
        let http_client = reqwest::Client::builder()
            .pool_idle_timeout(std::time::Duration::from_secs(90))
            .pool_max_idle_per_host(32)
            .tcp_nodelay(true)
            .connect_timeout(std::time::Duration::from_secs(5))
            .build()
            .unwrap_or_default();
        Self {
            db,
            config,
            in_flight: Arc::new(Mutex::new(HashMap::new())),
            http_client,
        }
    }
}

async fn is_fake_stub_mp3(path: &Path) -> bool {
    if let Ok(meta) = tokio::fs::metadata(path).await {
        if meta.len() < 200 {
            return true;
        }
        if meta.len() == 104_250 {
            if let Ok(mut file) = tokio::fs::File::open(path).await {
                use tokio::io::AsyncReadExt;
                let mut buf = [0u8; 10];
                if file.read_exact(&mut buf).await.is_ok() {
                    if buf[0..4] == [0xff, 0xfb, 0x90, 0x64] && buf[4..10] == [0, 1, 2, 3, 4, 5] {
                        return true;
                    }
                }
            }
        }
    }
    false
}

fn is_valid_mp3_buffer(buf: &[u8]) -> bool {
    if buf.len() < 200 {
        return false;
    }
    // Check ID3 tag ("ID3") or MPEG frame sync (0xFF followed by 0xE0..=0xFF)
    let has_id3 = buf.len() >= 3 && &buf[0..3] == b"ID3";
    let has_sync = buf.len() >= 2 && buf[0] == 0xff && (buf[1] & 0xe0) == 0xe0;
    if !(has_id3 || has_sync) {
        return false;
    }
    // Reject the old fake 0..255 pattern
    if buf.len() >= 10
        && buf[0..4] == [0xff, 0xfb, 0x90, 0x64]
        && buf[4..10] == [0, 1, 2, 3, 4, 5]
    {
        return false;
    }
    true
}

fn has_speakable_content(text: &str) -> bool {
    text.chars().any(|ch| {
        ch.is_alphanumeric()
            || matches!(
                ch,
                '\u{4e00}'..='\u{9fff}'
                    | '\u{3400}'..='\u{4dbf}'
                    | '\u{f900}'..='\u{faff}'
                    | '\u{3040}'..='\u{30ff}'
                    | '\u{ac00}'..='\u{d7af}'
            )
    })
}

fn get_silent_mp3_buffer() -> Vec<u8> {
    let frame_len = 418;
    let mut buf = Vec::with_capacity(frame_len * 4);
    for _ in 0..4 {
        let mut frame = vec![0u8; frame_len];
        frame[0] = 0xff;
        frame[1] = 0xfb;
        frame[2] = 0x90;
        frame[3] = 0x64;
        buf.extend_from_slice(&frame);
    }
    buf
}

fn strip_citation_markers(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let chars: Vec<char> = input.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        let ch = chars[i];

        // 1. Circled citation numbers: ①..⑳, ⑴..⒇, ⒈..⒛
        if matches!(ch, '\u{2460}'..='\u{2473}' | '\u{2474}'..='\u{2487}' | '\u{2488}'..='\u{249B}') {
            i += 1;
            continue;
        }

        // 2. Caret superscripts: ^(9)^ or ^(text) or ^[text] or ^123^
        if ch == '^' {
            let mut j = i + 1;
            if j < len && (chars[j] == '(' || chars[j] == '（' || chars[j] == '[') {
                let close = match chars[j] {
                    '(' => ')',
                    '（' => '）',
                    '[' => ']',
                    _ => ')',
                };
                let mut depth = 1;
                j += 1;
                while j < len && depth > 0 {
                    if chars[j] == chars[i + 1] {
                        depth += 1;
                    } else if chars[j] == close {
                        depth -= 1;
                    }
                    j += 1;
                }
                if j < len && chars[j] == '^' {
                    j += 1;
                }
                i = j;
                continue;
            } else if j < len && chars[j].is_ascii_digit() {
                while j < len && chars[j].is_ascii_digit() {
                    j += 1;
                }
                if j < len && chars[j] == '^' {
                    j += 1;
                }
                i = j;
                continue;
            }
        }

        // 3. Parentheses or brackets containing ONLY numbers or "注+numbers":
        // e.g. (22), （22）, (注1), （注1）, [1], 【1】, 〔1〕, 〔注1〕
        if matches!(ch, '(' | '（' | '[' | '【' | '〔') {
            let close = match ch {
                '(' => ')',
                '（' => '）',
                '[' => ']',
                '【' => '】',
                '〔' => '〕',
                _ => ')',
            };
            let mut j = i + 1;
            // Check for optional "注"
            if j < len && chars[j] == '注' {
                j += 1;
            }
            let start_digits = j;
            while j < len && chars[j].is_ascii_digit() {
                j += 1;
            }
            // If it had at least one digit and closes right away (and at most 4 digits, typical footnote)
            if j > start_digits && (j - start_digits) <= 4 && j < len && chars[j] == close {
                i = j + 1;
                continue;
            }
        }

        out.push(ch);
        i += 1;
    }

    out
}

fn sanitize_tts_text(text: &str) -> String {
    let mut s = text.trim();
    while s.starts_with('>') {
        s = s[1..].trim_start();
    }

    let unescaped = s
        .replace("&quot;", "\"")
        .replace("&ldquo;", "\"")
        .replace("&rdquo;", "\"")
        .replace("&lsquo;", "'")
        .replace("&rsquo;", "'")
        .replace("&apos;", "'")
        .replace("&#34;", "\"")
        .replace("&#39;", "'")
        .replace("&amp;", "&");

    let stripped_citations = strip_citation_markers(&unescaped);
    let chars: Vec<char> = stripped_citations.chars().collect();
    let mut cleaned = String::with_capacity(chars.len());
    let len = chars.len();

    for (i, &ch) in chars.iter().enumerate() {
        if matches!(
            ch,
            '“' | '”' | '‘' | '’' | '「' | '」' | '『' | '』' | '〝' | '〞' | '＂' | '"' | '«' | '»' | '‹' | '›'
        ) {
            continue;
        }

        if ch == '\'' {
            let prev_is_alpha = i > 0 && chars[i - 1].is_ascii_alphabetic();
            let next_is_alpha = i + 1 < len && chars[i + 1].is_ascii_alphabetic();
            if prev_is_alpha && next_is_alpha {
                cleaned.push('\'');
            }
            continue;
        }

        if matches!(
            ch,
            '*' | '#' | '~' | '^' | '_' | '=' | '\\' | '·' | '•' | '【' | '】' | '>' | '<' | '|' | '`'
        ) {
            cleaned.push(' ');
            continue;
        }

        cleaned.push(ch);
    }

    cleaned.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn split_text_into_tts_chunks(text: &str, max_chars: usize) -> Vec<String> {
    let trimmed = text.trim();
    if trimmed.chars().count() <= max_chars {
        return if trimmed.is_empty() {
            Vec::new()
        } else {
            vec![trimmed.to_string()]
        };
    }

    let mut chunks = Vec::new();
    let mut current = String::new();

    for ch in trimmed.chars() {
        current.push(ch);
        let char_cnt = current.chars().count();
        let is_sentence_end = matches!(ch, '。' | '！' | '？' | '；' | '.' | '!' | '?' | ';' | '\n');
        let is_clause_end = matches!(ch, '，' | '、' | '：' | ',' | ':');

        if (is_sentence_end && char_cnt >= max_chars * 3 / 4)
            || (is_clause_end && char_cnt >= max_chars * 9 / 10)
            || char_cnt >= max_chars
        {
            let piece = current.trim().to_string();
            if !piece.is_empty() {
                chunks.push(piece);
            }
            current.clear();
        }
    }

    let tail = current.trim().to_string();
    if !tail.is_empty() {
        chunks.push(tail);
    }
    if chunks.is_empty() && !trimmed.is_empty() {
        chunks.push(trimmed.to_string());
    }
    chunks
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TtsRoleSegment {
    pub text: String,
    pub is_dialogue: bool,
}

pub fn parse_dialogue_segments(text: &str) -> Vec<TtsRoleSegment> {
    let unescaped = text
        .replace("&quot;", "\"")
        .replace("&ldquo;", "“")
        .replace("&rdquo;", "”")
        .replace("&lsquo;", "‘")
        .replace("&rsquo;", "’")
        .replace("&apos;", "'")
        .replace("&#34;", "\"")
        .replace("&#39;", "'")
        .replace("&amp;", "&");

    let chars: Vec<char> = unescaped.chars().collect();
    let len = chars.len();
    let mut segments: Vec<TtsRoleSegment> = Vec::new();
    let mut current = String::new();
    let mut in_dialogue = false;
    let mut quote_open_char = '\0';

    let mut i = 0;
    while i < len {
        let ch = chars[i];

        let is_open_quote = match ch {
            '“' | '「' | '『' | '〝' | '«' | '‹' => true,
            '‘' => {
                let prev_is_alpha = i > 0 && chars[i - 1].is_ascii_alphabetic();
                let next_is_alpha = i + 1 < len && chars[i + 1].is_ascii_alphabetic();
                !(prev_is_alpha && next_is_alpha)
            }
            '"' if !in_dialogue => true,
            _ => false,
        };

        let is_close_quote = match ch {
            '”' | '」' | '』' | '〞' | '»' | '›' => true,
            '’' => {
                let prev_is_alpha = i > 0 && chars[i - 1].is_ascii_alphabetic();
                let next_is_alpha = i + 1 < len && chars[i + 1].is_ascii_alphabetic();
                !(prev_is_alpha && next_is_alpha)
            }
            '"' if in_dialogue => true,
            _ => false,
        };

        if !in_dialogue && is_open_quote {
            let seg_text = current.trim().to_string();
            if !seg_text.is_empty() {
                segments.push(TtsRoleSegment {
                    text: seg_text,
                    is_dialogue: false,
                });
            }
            current.clear();
            in_dialogue = true;
            quote_open_char = ch;
            i += 1;
            continue;
        }

        if in_dialogue
            && (is_close_quote
                || (quote_open_char != '\0' && is_matching_close_quote(quote_open_char, ch)))
        {
            let seg_text = current.trim().to_string();
            if !seg_text.is_empty() {
                segments.push(TtsRoleSegment {
                    text: seg_text,
                    is_dialogue: true,
                });
            }
            current.clear();
            in_dialogue = false;
            quote_open_char = '\0';
            i += 1;
            continue;
        }

        current.push(ch);
        i += 1;
    }

    let tail = current.trim().to_string();
    if !tail.is_empty() {
        segments.push(TtsRoleSegment {
            text: tail,
            is_dialogue: in_dialogue,
        });
    }

    if segments.is_empty() && !text.trim().is_empty() {
        segments.push(TtsRoleSegment {
            text: text.trim().to_string(),
            is_dialogue: false,
        });
    }

    // Distinguish real spoken dialogue from inline quoted terms/idioms (e.g. “洋鬼子”, “为富不仁”)
    for idx in 0..segments.len() {
        if segments[idx].is_dialogue {
            let t = segments[idx].text.trim();
            let char_len = t.chars().count();
            let ends_with_sentence_punct = t.ends_with(['。', '！', '？', '!', '?', '…', '~', '.']);
            let prev_ends_with_colon = idx > 0 && {
                let prev = segments[idx - 1].text.trim();
                prev.ends_with(['：', ':'])
            };
            let is_real_dialogue =
                ends_with_sentence_punct || prev_ends_with_colon || char_len >= 15;
            if !is_real_dialogue {
                segments[idx].is_dialogue = false;
            }
        }
    }

    // Merge consecutive segments with the same role to avoid fragmented TTS synthesis
    let mut merged: Vec<TtsRoleSegment> = Vec::with_capacity(segments.len());
    for seg in segments {
        if let Some(last) = merged.last_mut() {
            if last.is_dialogue == seg.is_dialogue {
                last.text.push_str(&seg.text);
                continue;
            }
        }
        merged.push(seg);
    }

    merged
}

fn is_matching_close_quote(open: char, close: char) -> bool {
    matches!(
        (open, close),
        ('“', '”')
            | ('‘', '’')
            | ('「', '」')
            | ('『', '』')
            | ('〝', '〞')
            | ('«', '»')
            | ('‹', '›')
            | ('"', '"')
    )
}

fn resolve_dual_role_voices<'a>(
    voice: Option<&'a str>,
    dialogue_voice: Option<&'a str>,
) -> (&'a str, &'a str) {
    let raw_v = voice.unwrap_or("").trim();
    let raw_d = dialogue_voice.unwrap_or("").trim();

    if raw_v == "drama-yunxi-xiaoxiao" {
        return ("zh-CN-YunxiNeural", "zh-CN-XiaoxiaoNeural");
    }
    if raw_v == "drama-yunjian-xiaoxiao" || raw_v == "drama-cn-classic" {
        return ("zh-CN-YunjianNeural", "zh-CN-XiaoxiaoNeural");
    }
    if raw_v.starts_with("drama-") {
        return ("zh-CN-YunxiNeural", "zh-CN-XiaoxiaoNeural");
    }

    let narration = if raw_v.is_empty() {
        "zh-CN-YunxiNeural"
    } else {
        raw_v
    };

    let dialogue = if raw_d.is_empty() || raw_d.starts_with("drama-") {
        if narration == "zh-CN-YunxiNeural" || narration == "zh-CN-YunjianNeural" {
            "zh-CN-XiaoxiaoNeural"
        } else {
            narration
        }
    } else {
        raw_d
    };

    (narration, dialogue)
}

fn map_to_edge_voice<'a>(voice: &'a str) -> (&'a str, &'static str, &'static str) {
    match voice {
        // 1. 官方原生支持的 Edge Neural 中文与方言音色
        "zh-CN-XiaoxiaoNeural" => ("zh-CN-XiaoxiaoNeural", "+0Hz", "+0%"),
        "zh-CN-YunxiNeural" => ("zh-CN-YunxiNeural", "+0Hz", "+0%"),
        "zh-CN-YunjianNeural" => ("zh-CN-YunjianNeural", "+0Hz", "+0%"),
        "zh-CN-XiaoyiNeural" => ("zh-CN-XiaoyiNeural", "+0Hz", "+0%"),
        "zh-CN-YunyangNeural" => ("zh-CN-YunyangNeural", "+0Hz", "+0%"),
        "zh-CN-YunxiaNeural" => ("zh-CN-YunxiaNeural", "+0Hz", "+0%"),
        "zh-CN-liaoning-XiaobeiNeural" => ("zh-CN-liaoning-XiaobeiNeural", "+0Hz", "+0%"),
        "zh-CN-shaanxi-XiaoniNeural" => ("zh-CN-shaanxi-XiaoniNeural", "+0Hz", "+0%"),
        "zh-TW-HsiaoChenNeural" => ("zh-TW-HsiaoChenNeural", "+0Hz", "+0%"),
        "zh-TW-HsiaoYuNeural" => ("zh-TW-HsiaoYuNeural", "+0Hz", "+0%"),
        "zh-TW-YunJheNeural" => ("zh-TW-YunJheNeural", "+0Hz", "+0%"),
        "zh-HK-HiuMaanNeural" => ("zh-HK-HiuMaanNeural", "+0Hz", "+0%"),
        "zh-HK-HiuGaaiNeural" => ("zh-HK-HiuGaaiNeural", "+0Hz", "+0%"),
        "zh-HK-WanLungNeural" => ("zh-HK-WanLungNeural", "+0Hz", "+0%"),

        // 2. 官方原生支持的 Edge Neural 英文与多语言音色
        "en-US-AvaMultilingualNeural" => ("en-US-AvaMultilingualNeural", "+0Hz", "+0%"),
        "en-US-BrianMultilingualNeural" => ("en-US-BrianMultilingualNeural", "+0Hz", "+0%"),
        "en-US-AndrewMultilingualNeural" => ("en-US-AndrewMultilingualNeural", "+0Hz", "+0%"),
        "en-US-EmmaMultilingualNeural" => ("en-US-EmmaMultilingualNeural", "+0Hz", "+0%"),
        "en-US-JennyNeural" => ("en-US-JennyNeural", "+0Hz", "+0%"),
        "en-US-GuyNeural" => ("en-US-GuyNeural", "+0Hz", "+0%"),
        "en-US-AriaNeural" => ("en-US-AriaNeural", "+0Hz", "+0%"),

        // 3. 常见历史 / Azure 专属不可用音色映射兜底 (映射到声线最接近的 Edge 原生音色，确保秒开绝不超时)
        "zh-CN-XiaochenNeural" | "zh-CN-XiaohanNeural" | "zh-CN-XiaoqiuNeural" | "zh-CN-XiaoruiNeural" | "zh-CN-XiaozhenNeural" => ("zh-CN-XiaoxiaoNeural", "+0Hz", "+0%"),
        "zh-CN-XiaomengNeural" | "zh-CN-XiaomoNeural" | "zh-CN-XiaoshuangNeural" => ("zh-CN-XiaoyiNeural", "+0Hz", "+0%"),
        "zh-CN-XiaoyanNeural" | "zh-CN-XiaoyouNeural" => ("zh-CN-XiaoxiaoNeural", "-1Hz", "-2%"),
        "zh-CN-YunfengNeural" | "zh-CN-YunzeNeural" => ("zh-CN-YunjianNeural", "-1Hz", "+0%"),
        "zh-CN-YunhaoNeural" => ("zh-CN-YunxiNeural", "+1Hz", "+0%"),
        "zh-CN-YunyeNeural" => ("zh-CN-YunyangNeural", "+0Hz", "+0%"),

        // 4. 云端虚拟模型音效映射
        "cloud-doubao-cancan" => ("zh-CN-XiaoxiaoNeural", "+2Hz", "+1%"),
        "cloud-lidan-chat" => ("zh-CN-YunxiNeural", "-3Hz", "-4%"),
        "cloud-xunfei-lingfeizhe" => ("zh-CN-YunyangNeural", "-2Hz", "+0%"),

        // 5. 其它英文音色兜底至 en-US-JennyNeural
        v if v.starts_with("en-") => ("en-US-JennyNeural", "+0Hz", "+0%"),

        // 6. 全局安全兜底至旗舰女声
        _ => ("zh-CN-XiaoxiaoNeural", "+0Hz", "+0%"),
    }
}

fn generate_sec_ms_gec() -> String {
    let trusted_token = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
    let now = chrono::Utc::now().timestamp() as u128;
    let win_epoch = 11644473600u128;
    let mut ticks = now + win_epoch;
    ticks -= ticks % 300;
    ticks *= 10_000_000;
    let data = format!("{}{}", ticks, trusted_token);
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    hex::encode(hasher.finalize()).to_uppercase()
}

fn generate_muid() -> String {
    let mut hasher = Sha256::new();
    hasher.update(chrono::Utc::now().to_rfc3339().as_bytes());
    hasher.update(&tokio::time::Instant::now().elapsed().as_nanos().to_le_bytes());
    let hex_val = hex::encode(hasher.finalize());
    hex_val[..32].to_uppercase()
}

async fn synthesize_via_edge_tts(
    chunk: &str,
    voice_name: &str,
    pitch: &str,
    rate: &str,
) -> Option<Vec<u8>> {
    let _ = rustls::crypto::ring::default_provider().install_default();

    let cfg_app = crate::config::current_config();
    let configured_ws = cfg_app.endpoints.edge_tts_ws_url.trim();

    // 候选端点列表：优先实测稳定的官方 bing 端点，备用 api.msedgeservices.com
    let mut candidate_urls: Vec<(&str, bool)> = vec![
        ("wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1", false),
        ("wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1", true),
    ];
    if !configured_ws.is_empty()
        && !configured_ws.contains("api.msedgeservices.com")
        && !configured_ws.contains("speech.platform.bing.com")
    {
        candidate_urls.push((configured_ws, false));
    }

    let escaped = chunk
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");

    let lang = if voice_name.starts_with("en-") {
        "en-US"
    } else if voice_name.starts_with("zh-HK") {
        "zh-HK"
    } else if voice_name.starts_with("zh-TW") {
        "zh-TW"
    } else {
        "zh-CN"
    };

    for (base_ws, is_msedge_api) in candidate_urls {
        let mut hasher = Sha256::new();
        hasher.update(chrono::Utc::now().to_rfc3339().as_bytes());
        hasher.update(&tokio::time::Instant::now().elapsed().as_nanos().to_le_bytes());
        let hex_val = hex::encode(hasher.finalize());
        let conn_id = &hex_val[..32];
        let req_id = &hex_val[..32];

        let sec_token = generate_sec_ms_gec();
        let sep = if base_ws.contains('?') { "&" } else { "?" };
        let token_arg = if is_msedge_api {
            "Ocp-Apim-Subscription-Key=6A5AA1D4EAFF4E9FB37E23D68491D6F4"
        } else {
            "TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4"
        };
        let url_str = format!(
            "{base_ws}{sep}{token_arg}&Sec-MS-GEC={sec_token}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId={conn_id}"
        );

        let Ok(mut req) = url_str.into_client_request() else {
            continue;
        };
        let h = req.headers_mut();
        let muid = generate_muid();
        if let Ok(cookie_val) = HeaderValue::from_str(&format!("muid={muid};")) {
            h.insert("Cookie", cookie_val);
        }
        h.insert("Pragma", HeaderValue::from_static("no-cache"));
        h.insert("Cache-Control", HeaderValue::from_static("no-cache"));
        h.insert(
            "User-Agent",
            HeaderValue::from_static(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68",
            ),
        );
        h.insert(
            "Origin",
            HeaderValue::from_static("chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold"),
        );
        h.insert(
            "Sec-WebSocket-Version",
            HeaderValue::from_static("13"),
        );
        h.insert(
            "Accept-Encoding",
            HeaderValue::from_static("gzip, deflate, br, zstd"),
        );
        h.insert(
            "Accept-Language",
            HeaderValue::from_static("en-US,en;q=0.9"),
        );

        let connect_res = tokio::time::timeout(
            std::time::Duration::from_millis(4000),
            connect_async(req),
        )
        .await;

        let (mut write, mut read) = match connect_res {
            Ok(Ok((stream, _resp))) => stream.split(),
            Ok(Err(e)) => {
                tracing::debug!("Edge TTS connect notice ({base_ws}): {e}");
                continue;
            }
            Err(_) => {
                tracing::debug!("Edge TTS connect timeout ({base_ws})");
                continue;
            }
        };

        let cfg = "Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{\"context\":{\"synthesis\":{\"audio\":{\"metadataoptions\":{\"sentenceBoundaryEnabled\":\"false\",\"wordBoundaryEnabled\":\"false\"},\"outputFormat\":\"audio-24khz-48kbitrate-mono-mp3\"}}}}";
        if write.send(Message::Text(cfg.into())).await.is_err() {
            continue;
        }

        let ssml = format!(
            "X-RequestId:{req_id}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{lang}'><voice name='{voice_name}'><prosody pitch='{pitch}' rate='{rate}' volume='+0%'>{escaped}</prosody></voice></speak>"
        );
        if write.send(Message::Text(ssml.into())).await.is_err() {
            continue;
        }

        let mut audio_bytes = Vec::new();
        let timeout_task = async {
            while let Some(msg_res) = read.next().await {
                match msg_res {
                    Ok(Message::Binary(bin)) => {
                        if bin.len() > 2 {
                            let h_len = u16::from_be_bytes([bin[0], bin[1]]) as usize;
                            if bin.len() >= 2 + h_len {
                                let header_str = String::from_utf8_lossy(&bin[2..2 + h_len]);
                                if header_str.contains("Path:audio") {
                                    audio_bytes.extend_from_slice(&bin[2 + h_len..]);
                                }
                            }
                        }
                    }
                    Ok(Message::Text(txt)) => {
                        if txt.contains("Path:turn.end") {
                            break;
                        }
                    }
                    _ => {}
                }
            }
        };

        if tokio::time::timeout(std::time::Duration::from_secs(12), timeout_task)
            .await
            .is_ok()
            && is_valid_mp3_buffer(&audio_bytes)
        {
            return Some(audio_bytes);
        }
    }

    None
}

async fn synthesize_chunk_mp3(
    chunk: &str,
    voice: &str,
    client: Option<&reqwest::Client>,
) -> Option<(Vec<u8>, &'static str)> {
    let cfg = crate::config::current_config();
    let (edge_voice, pitch, rate) = map_to_edge_voice(voice);

    // 0. If user configured a custom HTTP TTS endpoint, try it first
    let custom_ep = cfg.endpoints.custom_tts_url.trim();
    if !custom_ep.is_empty() {
        let fallback_client;
        let c = match client {
            Some(cl) => cl,
            None => {
                fallback_client = reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(6))
                    .connect_timeout(std::time::Duration::from_secs(3))
                    .build()
                    .unwrap_or_default();
                &fallback_client
            }
        };
        if let Ok(resp) = c
            .get(custom_ep)
            .query(&[("text", chunk), ("voice", voice)])
            .send()
            .await
        {
            if resp.status().is_success() {
                if let Ok(bytes) = resp.bytes().await {
                    if is_valid_mp3_buffer(&bytes) {
                        return Some((bytes.to_vec(), "custom-tts"));
                    }
                }
            }
        }
    }

    // 1. Try Microsoft Edge Neural TTS directly via WebSocket
    if let Some(buf) = synthesize_via_edge_tts(chunk, edge_voice, pitch, rate).await {
        return Some((buf, "edge-neural"));
    }

    // 2. Fast retry once if first attempt encountered temporary network jitter
    tokio::time::sleep(std::time::Duration::from_millis(150)).await;
    if let Some(buf) = synthesize_via_edge_tts(chunk, edge_voice, pitch, rate).await {
        return Some((buf, "edge-neural"));
    }

    None
}

#[async_trait]
impl TtsService for TtsServiceImpl {
    async fn speak(&self, text: &str, voice: Option<&str>) -> AppResult<Value> {
        if let Some(v) = voice {
            if v.starts_with("drama-") {
                return self.speak_dual_role(text, Some(v), None).await;
            }
        }

        let normalized = sanitize_tts_text(text);
        let live_cfg = crate::config::current_config();
        let default_v = live_cfg.endpoints.default_tts_voice.as_str();
        let voice_name = voice
            .filter(|v| !v.trim().is_empty())
            .unwrap_or(if default_v.is_empty() { "zh-CN-XiaoxiaoNeural" } else { default_v });

        if normalized.is_empty() || !has_speakable_content(&normalized) {
            let silent_buf = get_silent_mp3_buffer();
            let silent_hash = "silent_guard_v1";
            let mp3_path = self.config.tts_cache_dir.join(format!("{}.mp3", silent_hash));
            if !mp3_path.exists() {
                let _ = tokio::fs::write(&mp3_path, &silent_buf).await;
            }
            return Ok(serde_json::json!({
                "ok": true,
                "audio_url": format!("/api/tts/audio/{}", silent_hash),
                "file_path": mp3_path.to_string_lossy(),
                "audio_bytes": silent_buf.len(),
                "file_size": silent_buf.len(),
                "duration_ms": 150,
                "duration_estimate_sec": 0.2,
                "voice": voice_name,
                "engine": "silent-guard",
                "cached": true,
                "cache_key": silent_hash,
            }));
        }
        let rate_pct = "+0%";
        let pitch_hz = match voice_name {
            "cloud-lidan-chat" => "-3Hz",
            "cloud-doubao-cancan" => "+1Hz",
            _ => "+0Hz",
        };

        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        let text_hash = hex::encode(hasher.finalize());

        let mut key_hasher = Sha256::new();
        key_hasher.update(
            format!("v2|{}|{}|{}|{}", voice_name, rate_pct, pitch_hz, text_hash).as_bytes(),
        );
        let cache_key = hex::encode(key_hasher.finalize());

        let mp3_path = self.config.tts_cache_dir.join(format!("{}.mp3", cache_key));

        if mp3_path.exists() && is_fake_stub_mp3(&mp3_path).await {
            let _ = tokio::fs::remove_file(&mp3_path).await;
        }

        let was_cached = mp3_path.exists();
        let mut is_cached = was_cached;
        let mut engine_used = "edge-neural".to_string();

        if !is_cached {
            let (is_primary, notify) = {
                let mut guard = self.in_flight.lock().await;
                if let Some(existing) = guard.get(&cache_key) {
                    (false, existing.clone())
                } else {
                    let n = Arc::new(Notify::new());
                    guard.insert(cache_key.clone(), n.clone());
                    (true, n)
                }
            };

            if !is_primary {
                notify.notified().await;
                is_cached = mp3_path.exists() && !is_fake_stub_mp3(&mp3_path).await;
            } else {
                let chunks = split_text_into_tts_chunks(&normalized, 260);
                let client = &self.http_client;
                let mut combined_mp3 = Vec::new();
                let mut all_chunks_ok = !chunks.is_empty();
                for batch in chunks.chunks(6) {
                    let batch_futs = batch.iter().map(|chunk| {
                        synthesize_chunk_mp3(chunk, voice_name, Some(client))
                    });
                    let batch_results = futures_util::future::join_all(batch_futs).await;
                    for res in batch_results {
                        if let Some((buf, eng)) = res {
                            combined_mp3.extend_from_slice(&buf);
                            engine_used = eng.to_string();
                        } else {
                            all_chunks_ok = false;
                            break;
                        }
                    }
                    if !all_chunks_ok {
                        break;
                    }
                }

                if all_chunks_ok && is_valid_mp3_buffer(&combined_mp3) {
                    let _ = tokio::fs::write(&mp3_path, &combined_mp3).await;
                    is_cached = true;
                } else {
                    // Check if any cached audio for same text_hash and voice exists in tts_audio_cache
                    let fallback_key = self
                        .db
                        .interact({
                            let th = text_hash.clone();
                            let vn = voice_name.to_string();
                            move |conn| {
                                Ok(conn
                                    .query_row(
                                        "SELECT cache_key FROM tts_audio_cache WHERE text_hash = ? AND voice = ? AND engine = 'edge-neural' LIMIT 1",
                                        rusqlite::params![th, vn],
                                        |r| r.get::<_, String>(0),
                                    )
                                    .ok())
                            }
                        })
                        .await
                        .ok()
                        .flatten();

                    if let Some(fk) = fallback_key {
                        let fk_path = self.config.tts_cache_dir.join(format!("{}.mp3", fk));
                        if fk_path.exists() && !is_fake_stub_mp3(&fk_path).await {
                            let _ = tokio::fs::copy(&fk_path, &mp3_path).await;
                            is_cached = true;
                        }
                    }
                }

                {
                    let mut guard = self.in_flight.lock().await;
                    guard.remove(&cache_key);
                }
                notify.notify_waiters();
            }
        }

        if !mp3_path.exists() {
            return Err(DomainError::ValidationError(
                "语音合成网络暂不可达，已切换浏览器本地语音引擎".into(),
            )
            .into());
        }

        let meta = tokio::fs::metadata(&mp3_path).await.map_err(InfraError::Io)?;
        let file_size = meta.len() as i64;
        // Estimate duration from MP3 bitrate (~48kbps = 6000 bytes/sec, or character count)
        let char_est_ms = (normalized.chars().count() as i64 * 220).max(1200);
        let byte_est_ms = ((file_size as f64 / 5.5) as i64).max(1200);
        let duration_ms = if is_cached { byte_est_ms } else { char_est_ms.max(byte_est_ms / 2) };
        let duration_sec = (duration_ms as f64 / 1000.0 * 10.0).round() / 10.0;

        // Record/update SQLite tts_audio_cache
        let ck_db = cache_key.clone();
        let vn_db = voice_name.to_string();
        let rp_db = rate_pct.to_string();
        let ph_db = pitch_hz.to_string();
        let th_db = text_hash.clone();
        let preview: String = normalized.chars().take(80).collect();
        let fp_db = mp3_path.to_string_lossy().to_string();
        let eng_db = engine_used.clone();
        let now_str = chrono::Utc::now().to_rfc3339();
        let _ = self
            .db
            .interact(move |conn| {
                if was_cached {
                    let _ = conn.execute(
                        "UPDATE tts_audio_cache SET hit_count = hit_count + 1, last_accessed_at = ? WHERE cache_key = ?",
                        rusqlite::params![now_str, ck_db],
                    );
                } else {
                    let _ = conn.execute(
                        "INSERT OR REPLACE INTO tts_audio_cache (
                            cache_key, voice, rate, pitch, text_hash, text_preview,
                            file_path, file_size, duration_ms, engine, hit_count, created_at, last_accessed_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
                        rusqlite::params![
                            ck_db, vn_db, rp_db, ph_db, th_db, preview,
                            fp_db, file_size, duration_ms, eng_db, now_str, now_str
                        ],
                    );
                }
                Ok(())
            })
            .await;

        let audio_url = format!("/api/tts/audio/{}", cache_key);

        Ok(serde_json::json!({
            "ok": true,
            "audio_url": audio_url,
            "file_path": mp3_path.to_string_lossy(),
            "audio_bytes": file_size,
            "file_size": file_size,
            "duration_ms": duration_ms,
            "duration_estimate_sec": duration_sec,
            "voice": voice_name,
            "engine": engine_used,
            "cached": was_cached,
            "cache_key": cache_key,
        }))
    }

    async fn speak_dual_role(
        &self,
        text: &str,
        narration_voice: Option<&str>,
        dialogue_voice: Option<&str>,
    ) -> AppResult<Value> {
        let (n_voice, d_voice) = resolve_dual_role_voices(narration_voice, dialogue_voice);

        if n_voice == d_voice {
            return self.speak(text, Some(n_voice)).await;
        }

        let raw_segments = parse_dialogue_segments(text);
        let has_dialogue = raw_segments.iter().any(|s| s.is_dialogue);
        if !has_dialogue {
            return self.speak(text, Some(n_voice)).await;
        }

        let normalized = sanitize_tts_text(text);
        if normalized.is_empty() {
            return Err(DomainError::ValidationError("朗读文本不能为空".into()).into());
        }

        let rate_pct = "+0%";
        let pitch_hz = "+0Hz";

        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        let text_hash = hex::encode(hasher.finalize());

        let mut key_hasher = Sha256::new();
        key_hasher.update(
            format!(
                "v2-dual|{}|{}|{}|{}|{}",
                n_voice, d_voice, rate_pct, pitch_hz, text_hash
            )
            .as_bytes(),
        );
        let cache_key = hex::encode(key_hasher.finalize());

        let mp3_path = self.config.tts_cache_dir.join(format!("{}.mp3", cache_key));
        if mp3_path.exists() && is_fake_stub_mp3(&mp3_path).await {
            let _ = tokio::fs::remove_file(&mp3_path).await;
        }

        let was_cached = mp3_path.exists();
        let mut is_cached = was_cached;
        let mut engine_used = "edge-neural".to_string();

        if !is_cached {
            let (is_primary, notify) = {
                let mut guard = self.in_flight.lock().await;
                if let Some(existing) = guard.get(&cache_key) {
                    (false, existing.clone())
                } else {
                    let n = Arc::new(Notify::new());
                    guard.insert(cache_key.clone(), n.clone());
                    (true, n)
                }
            };

            if !is_primary {
                notify.notified().await;
                is_cached = mp3_path.exists() && !is_fake_stub_mp3(&mp3_path).await;
            } else {
                let mut tasks = Vec::new();
                for seg in &raw_segments {
                    let seg_clean = sanitize_tts_text(&seg.text);
                    if seg_clean.is_empty() {
                        continue;
                    }
                    let seg_voice = if seg.is_dialogue { d_voice } else { n_voice };
                    let chunks = split_text_into_tts_chunks(&seg_clean, 260);
                    for chunk in chunks {
                        tasks.push((chunk, seg_voice));
                    }
                }

                let client = &self.http_client;
                let mut combined_mp3 = Vec::new();
                let mut all_chunks_ok = !tasks.is_empty();
                for pair in tasks.chunks(6) {
                    let batch_futs = pair.iter().map(|(chunk, voice)| {
                        synthesize_chunk_mp3(chunk, voice, Some(client))
                    });
                    let batch_results = futures_util::future::join_all(batch_futs).await;
                    for res in batch_results {
                        if let Some((buf, eng)) = res {
                            combined_mp3.extend_from_slice(&buf);
                            engine_used = eng.to_string();
                        } else {
                            all_chunks_ok = false;
                            break;
                        }
                    }
                    if !all_chunks_ok {
                        break;
                    }
                }

                if all_chunks_ok && is_valid_mp3_buffer(&combined_mp3) {
                    let _ = tokio::fs::write(&mp3_path, &combined_mp3).await;
                    is_cached = true;
                }

                {
                    let mut guard = self.in_flight.lock().await;
                    guard.remove(&cache_key);
                }
                notify.notify_waiters();
            }
        }

        if !mp3_path.exists() {
            return Err(DomainError::ValidationError(
                "双音色广播剧语音合成暂不可达，已切换本地引擎".into(),
            )
            .into());
        }

        let meta = tokio::fs::metadata(&mp3_path).await.map_err(InfraError::Io)?;
        let file_size = meta.len() as i64;
        let char_est_ms = (normalized.chars().count() as i64 * 220).max(1200);
        let byte_est_ms = ((file_size as f64 / 5.5) as i64).max(1200);
        let duration_ms = if is_cached { byte_est_ms } else { char_est_ms.max(byte_est_ms / 2) };
        let duration_sec = (duration_ms as f64 / 1000.0 * 10.0).round() / 10.0;
        let dual_label = format!("{}+{}", n_voice, d_voice);

        let ck_db = cache_key.clone();
        let vn_db = dual_label.clone();
        let rp_db = rate_pct.to_string();
        let ph_db = pitch_hz.to_string();
        let th_db = text_hash.clone();
        let preview: String = normalized.chars().take(80).collect();
        let fp_db = mp3_path.to_string_lossy().to_string();
        let eng_db = engine_used.clone();
        let now_str = chrono::Utc::now().to_rfc3339();
        let _ = self
            .db
            .interact(move |conn| {
                if was_cached {
                    let _ = conn.execute(
                        "UPDATE tts_audio_cache SET hit_count = hit_count + 1, last_accessed_at = ? WHERE cache_key = ?",
                        rusqlite::params![now_str, ck_db],
                    );
                } else {
                    let _ = conn.execute(
                        "INSERT OR REPLACE INTO tts_audio_cache (
                            cache_key, voice, rate, pitch, text_hash, text_preview,
                            file_path, file_size, duration_ms, engine, hit_count, created_at, last_accessed_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
                        rusqlite::params![
                            ck_db, vn_db, rp_db, ph_db, th_db, preview,
                            fp_db, file_size, duration_ms, eng_db, now_str, now_str
                        ],
                    );
                }
                Ok(())
            })
            .await;

        let audio_url = format!("/api/tts/audio/{}", cache_key);

        Ok(serde_json::json!({
            "ok": true,
            "audio_url": audio_url,
            "file_path": mp3_path.to_string_lossy(),
            "audio_bytes": file_size,
            "file_size": file_size,
            "duration_ms": duration_ms,
            "duration_estimate_sec": duration_sec,
            "voice": dual_label,
            "narration_voice": n_voice,
            "dialogue_voice": d_voice,
            "is_dual_role": true,
            "engine": engine_used,
            "cached": was_cached,
            "cache_key": cache_key,
        }))
    }

    async fn get_audio(&self, hash: &str) -> AppResult<Option<PathBuf>> {
        let clean = hash.trim();
        if clean.is_empty()
            || clean.len() > 128
            || !clean.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
        {
            return Ok(None);
        }
        let p = self.config.tts_cache_dir.join(format!("{}.mp3", clean));
        if p.exists() && !is_fake_stub_mp3(&p).await {
            Ok(Some(p))
        } else {
            Ok(None)
        }
    }

    fn list_voices(&self) -> Value {
        serde_json::json!([
            {
                "id": "drama-yunxi-xiaoxiao",
                "name": "广播剧 · 云希旁白+晓晓对白",
                "shortName": "广播剧 (云希/晓晓)",
                "badge": "智能多角色 · 广播剧演播",
                "category": "flagship",
                "provider": "edge-neural",
                "gender": "male",
                "lang": "zh-CN",
                "recommended": true,
                "description": "智能识别小说对话与旁白：云希温润朗读旁白，晓晓情感充沛演绎对白，呈现双音色广播剧体验"
            },
            {
                "id": "drama-yunjian-xiaoxiao",
                "name": "广播剧 · 云健演播+晓晓对白",
                "shortName": "广播剧 (云健/晓晓)",
                "badge": "双角色演播 · 史诗悬疑",
                "category": "flagship",
                "provider": "edge-neural",
                "gender": "male",
                "lang": "zh-CN",
                "recommended": true,
                "description": "云健磁性剧场男声旁白，晓晓富有故事张力演绎对白，极具沉浸故事感染力"
            },
            {
                "id": "zh-CN-XiaoxiaoNeural",
                "name": "晓晓 · 温暖自然女声",
                "shortName": "晓晓 (温暖女声)",
                "badge": "旗舰推荐 · 文学/全能",
                "category": "flagship",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "zh-CN",
                "recommended": true,
                "description": "微软旗舰级超拟人女声，呼吸感与情感细节极佳，最适合小说、散文与长文沉浸听书"
            },
            {
                "id": "zh-CN-YunjianNeural",
                "name": "云健 · 磁性沉稳男声",
                "shortName": "云健 (磁性演播)",
                "badge": "大师演播 · 史诗/悬疑",
                "category": "flagship",
                "provider": "edge-neural",
                "gender": "male",
                "lang": "zh-CN",
                "recommended": true,
                "description": "浑厚磁性的剧场感演播男声，极具故事张力，适合科幻、历史、经典名著与悬疑叙事"
            },
            {
                "id": "zh-CN-YunxiNeural",
                "name": "云希 · 清澈书卷男声",
                "shortName": "云希 (清澈书生)",
                "badge": "温润书卷 · 叙事/哲思",
                "category": "flagship",
                "provider": "edge-neural",
                "gender": "male",
                "lang": "zh-CN",
                "recommended": true,
                "description": "清亮儒雅的书卷少年音，节奏舒缓，适合散文随笔、诗词鉴赏与科普随笔"
            },
            {
                "id": "zh-TW-HsiaoChenNeural",
                "name": "晓臻 · 温润治愈女声",
                "shortName": "晓臻 (台湾国语)",
                "badge": "温润舒缓 · 散文/美学",
                "category": "dialect",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "zh-TW",
                "recommended": true,
                "description": "温柔细腻的舒缓声线，极适合散文、心理学与睡前伴读"
            },
            {
                "id": "zh-CN-XiaoyiNeural",
                "name": "晓伊 · 灵动亲和女声",
                "shortName": "晓伊 (亲切灵动)",
                "badge": "轻快灵动 · 随笔/日常",
                "category": "flagship",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "zh-CN",
                "recommended": false,
                "description": "清脆温婉的生活感女声，语调亲切自然，适合传记回忆录、生活美学与旅行随笔"
            },
            {
                "id": "zh-CN-YunyangNeural",
                "name": "云扬 · 专业播音男声",
                "shortName": "云扬 (专业新闻)",
                "badge": "专业权威 · 经管/时政",
                "category": "flagship",
                "provider": "edge-neural",
                "gender": "male",
                "lang": "zh-CN",
                "recommended": false,
                "description": "字正腔圆的标准播音腔，发音清晰笃定，适合财经商业、社科社论与深度报道"
            },
            {
                "id": "zh-TW-HsiaoYuNeural",
                "name": "晓雨 · 恬静优雅女声",
                "shortName": "晓雨 (台湾国语)",
                "badge": "轻柔优雅 · 随笔/小说",
                "category": "dialect",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "zh-TW",
                "recommended": false,
                "description": "清雅恬淡的台湾女声，吐字自然轻柔，适合现代文学与情感散文"
            },
            {
                "id": "zh-TW-YunJheNeural",
                "name": "云哲 · 台湾国语男声",
                "shortName": "云哲 (台湾国语)",
                "badge": "自然亲切 · 散文/播客",
                "category": "dialect",
                "provider": "edge-neural",
                "gender": "male",
                "lang": "zh-TW",
                "recommended": false,
                "description": "腔调温和自然的台湾青年男声，适合生活哲学、旅行文学与人文对话"
            },
            {
                "id": "zh-HK-HiuMaanNeural",
                "name": "晓曼 · 粤语清丽女声",
                "shortName": "晓曼 (地道粤语)",
                "badge": "地道粤韵 · 粤语有声",
                "category": "dialect",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "zh-HK",
                "recommended": true,
                "description": "纯正地道广府粤语女声，发音清雅悦耳，适合粤港文化读物与经典粤语书卷"
            },
            {
                "id": "zh-HK-HiuGaaiNeural",
                "name": "晓佳 · 粤语亲切女声",
                "shortName": "晓佳 (生活粤语)",
                "badge": "生动日常 · 粤语生活",
                "category": "dialect",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "zh-HK",
                "recommended": false,
                "description": "生活气息浓厚的粤语女声，亲切自然，适合现代故事与随笔漫谈"
            },
            {
                "id": "zh-HK-WanLungNeural",
                "name": "云龙 · 粤语沉稳男声",
                "shortName": "云龙 (沉稳粤语)",
                "badge": "沉着演播 · 粤语名篇",
                "category": "dialect",
                "provider": "edge-neural",
                "gender": "male",
                "lang": "zh-HK",
                "recommended": false,
                "description": "雄浑庄重的粤语男声，抑扬顿挫富有感染力，适合粤语长篇名著演播"
            },
            {
                "id": "zh-CN-liaoning-XiaobeiNeural",
                "name": "小北 · 东北方言女声",
                "shortName": "小北 (东北话)",
                "badge": "诙谐风趣 · 故事市井",
                "category": "dialect",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "zh-CN",
                "recommended": false,
                "description": "地道生动的东北口音，亲和风趣富有画面感，特别适合通俗演义与民俗小说"
            },
            {
                "id": "zh-CN-shaanxi-XiaoniNeural",
                "name": "小妮 · 陕西方言女声",
                "shortName": "小妮 (陕西话)",
                "badge": "质朴豪爽 · 乡土文学",
                "category": "dialect",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "zh-CN",
                "recommended": false,
                "description": "纯朴醇厚的秦川乡音，真挚豪爽，极适合西北风情与乡土文学朗读"
            },
            {
                "id": "en-US-AvaMultilingualNeural",
                "name": "Ava · 中英双语女声",
                "shortName": "Ava (中英双语)",
                "badge": "中英双语 · 无缝混排",
                "category": "bilingual",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "en-US",
                "recommended": true,
                "description": "原生支持中英双语自然切换，适合英文原著与双语夹杂文本"
            },
            {
                "id": "en-US-BrianMultilingualNeural",
                "name": "Brian · 慵懒播客男声",
                "shortName": "Brian (松弛播客)",
                "badge": "松弛漫谈 · 零机械感",
                "category": "podcast",
                "provider": "edge-neural",
                "gender": "male",
                "lang": "en-US",
                "recommended": true,
                "description": "跨语言自然男声，吐字松弛随性，像老友在书房随性漫谈"
            },
            {
                "id": "en-US-AndrewMultilingualNeural",
                "name": "Andrew · 温暖知性男声",
                "shortName": "Andrew (温暖知性)",
                "badge": "中英双语 · 绅士从容",
                "category": "bilingual",
                "provider": "edge-neural",
                "gender": "male",
                "lang": "en-US",
                "recommended": false,
                "description": "发音醇厚的英美质感男声，中英混排极其自然优雅，适合非虚构佳作"
            },
            {
                "id": "en-US-EmmaMultilingualNeural",
                "name": "Emma · 明朗灵动女声",
                "shortName": "Emma (明朗灵动)",
                "badge": "中英双语 · 灵动自然",
                "category": "bilingual",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "en-US",
                "recommended": false,
                "description": "现代感十足的国际化女声，中英发音标准无瑕，适合当代商业与科技读本"
            },
            {
                "id": "en-US-JennyNeural",
                "name": "Jenny · 经典纯正英文女声",
                "shortName": "Jenny (纯正英文)",
                "badge": "原汁原味 · 英文原版",
                "category": "bilingual",
                "provider": "edge-neural",
                "gender": "female",
                "lang": "en-US",
                "recommended": false,
                "description": "微软极具代表性的高辨识度北美自然女声，最适宜英文长篇原著朗读"
            }
        ])
    }

    fn get_config(&self) -> Value {
        let cfg = crate::config::current_config();
        let active = if !cfg.endpoints.custom_tts_url.trim().is_empty() {
            "custom"
        } else {
            "edge-neural"
        };
        serde_json::json!({
            "active_provider": active,
            "edge_enabled": !cfg.endpoints.edge_tts_ws_url.trim().is_empty(),
            "custom_endpoint": cfg.endpoints.custom_tts_url,
            "default_voice": cfg.endpoints.default_tts_voice,
            "edge_tts_ws_url": cfg.endpoints.edge_tts_ws_url,
            "google_tts_url": cfg.endpoints.google_tts_url,
            "baidu_tts_url": cfg.endpoints.baidu_tts_url,
            "youdao_tts_url": cfg.endpoints.youdao_tts_url,
        })
    }

    fn update_config(&self, val: Value) -> AppResult<()> {
        let mut patch = serde_json::Map::new();
        if let Some(ep) = val.get("custom_endpoint").or_else(|| val.get("custom_tts_url")).and_then(|v| v.as_str()) {
            patch.insert("custom_tts_url".to_string(), Value::String(ep.to_string()));
        }
        if let Some(v) = val.get("default_voice").or_else(|| val.get("default_tts_voice")).and_then(|v| v.as_str()) {
            patch.insert("default_tts_voice".to_string(), Value::String(v.to_string()));
        }
        if !patch.is_empty() {
            let _ = crate::config::update_global_config(&Value::Object(patch));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_tts_text() {
        let input = "“请别进来，上校。”他说：‘It's a secret, don't look!’ «你好» 「测试」";
        let cleaned = sanitize_tts_text(input);
        assert!(!cleaned.contains('“'));
        assert!(!cleaned.contains('”'));
        assert!(!cleaned.contains('‘'));
        assert!(!cleaned.contains('’'));
        assert!(!cleaned.contains('「'));
        assert!(!cleaned.contains('」'));
        assert!(!cleaned.contains('«'));
        assert!(!cleaned.contains('»'));
        assert!(cleaned.contains("It's"));
        assert!(cleaned.contains("don't"));
        assert_eq!(
            cleaned,
            "请别进来，上校。他说：It's a secret, don't look! 你好 测试"
        );

        let quote_block = "> 这是引用段落内容";
        assert_eq!(sanitize_tts_text(quote_block), "这是引用段落内容");

        let single_gt = ">";
        assert_eq!(sanitize_tts_text(single_gt), "");

        let multi_gt = ">>>   ";
        assert_eq!(sanitize_tts_text(multi_gt), "");

        // Citation tests: (22), (23), ^(9)^, ^((新唐书...)), ①, while keeping normal (1984年) and (GDP)
        let text_with_citations = "结果不一定对上级更有利。(22) 专职办事的人员实际权力很大。（23） 太常奏：“^(9)^” 以及^((新唐书卷五十一·后妃传))，包含①和[12]与〔注3〕。但在(1984年)成立的(GDP)机构仍保留。";
        let cleaned_citations = sanitize_tts_text(text_with_citations);
        assert!(!cleaned_citations.contains("22"));
        assert!(!cleaned_citations.contains("23"));
        assert!(!cleaned_citations.contains("新唐书"));
        assert!(!cleaned_citations.contains('①'));
        assert!(cleaned_citations.contains("结果不一定对上级更有利。"));
        assert!(cleaned_citations.contains("专职办事的人员实际权力很大。"));
        assert!(cleaned_citations.contains("(1984年)"));
        assert!(cleaned_citations.contains("(GDP)"));
    }

    #[test]
    fn test_non_speakable_content_and_silent_buffer() {
        assert!(!has_speakable_content(">"));
        assert!(!has_speakable_content(">>> --- ***"));
        assert!(!has_speakable_content("... --- ..."));
        assert!(has_speakable_content("面对自身缺点，你有4种选择"));
        assert!(has_speakable_content("Hello World"));

        let silent_buf = get_silent_mp3_buffer();
        assert!(is_valid_mp3_buffer(&silent_buf));
        assert!(silent_buf.len() > 1000);
    }

    #[tokio::test]
    async fn test_edge_tts_synthesis() {
        let text = "你好，这是测试语音合成。";
        let res = synthesize_chunk_mp3(text, "zh-CN-YunjianNeural", None).await;
        if let Some((bytes, engine)) = res {
            println!("TTS engine: {}, bytes: {}", engine, bytes.len());
            assert!(bytes.len() > 100);
        } else {
            println!("Edge TTS synthesis offline or rate-limited, skipping remote assertion");
        }
    }

    #[tokio::test]
    async fn test_edge_tts_with_quotes() {
        let text = sanitize_tts_text("“请别进来，上校。”他说：‘It's a secret!’");
        let res = synthesize_chunk_mp3(&text, "zh-CN-XiaoxiaoNeural", None).await;
        if let Some((bytes, engine)) = res {
            println!("TTS engine: {}, bytes: {}", engine, bytes.len());
            assert_eq!(engine, "edge-neural");
            assert!(bytes.len() > 100);
        } else {
            println!("Edge TTS synthesis offline or rate-limited, skipping remote assertion");
        }
    }

    #[test]
    fn test_parse_dialogue_segments() {
        let input = "他叹了一口气，轻声道：“我们走吧，时间不多了。”然后转身离去。";
        let segs = parse_dialogue_segments(input);
        assert_eq!(segs.len(), 3);
        assert_eq!(segs[0].text, "他叹了一口气，轻声道：");
        assert!(!segs[0].is_dialogue);
        assert_eq!(segs[1].text, "我们走吧，时间不多了。");
        assert!(segs[1].is_dialogue);
        assert_eq!(segs[2].text, "然后转身离去。");
        assert!(!segs[2].is_dialogue);

        let input_no_quotes = "落霞与孤鹜齐飞，秋水共长天一色。";
        let segs_no = parse_dialogue_segments(input_no_quotes);
        assert_eq!(segs_no.len(), 1);
        assert!(!segs_no[0].is_dialogue);
        assert_eq!(segs_no[0].text, input_no_quotes);
    }

    #[test]
    fn test_resolve_dual_role_voices() {
        let (n1, d1) = resolve_dual_role_voices(Some("drama-yunxi-xiaoxiao"), None);
        assert_eq!(n1, "zh-CN-YunxiNeural");
        assert_eq!(d1, "zh-CN-XiaoxiaoNeural");

        let (n2, d2) = resolve_dual_role_voices(Some("drama-yunjian-xiaoxiao"), None);
        assert_eq!(n2, "zh-CN-YunjianNeural");
        assert_eq!(d2, "zh-CN-XiaoxiaoNeural");

        let (n3, d3) = resolve_dual_role_voices(Some("zh-CN-YunxiNeural"), Some("zh-CN-XiaoyiNeural"));
        assert_eq!(n3, "zh-CN-YunxiNeural");
        assert_eq!(d3, "zh-CN-XiaoyiNeural");
    }
}

