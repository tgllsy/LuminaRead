use futures_util::{SinkExt, StreamExt};
use sha2::{Digest, Sha256};
use std::path::Path;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Message;

pub async fn is_fake_stub_mp3(path: &Path) -> bool {
    let Ok(meta) = tokio::fs::metadata(path).await else {
        return false;
    };
    if meta.len() == 0 {
        return true;
    }
    if meta.len() < 128 {
        if let Ok(content) = tokio::fs::read(path).await {
            let s = String::from_utf8_lossy(&content);
            if s.contains("html") || s.contains("error") || s.contains("404") || s.contains("403") {
                return true;
            }
        }
    }
    false
}

pub fn is_valid_mp3_buffer(buf: &[u8]) -> bool {
    if buf.len() < 64 {
        return false;
    }
    if buf.starts_with(b"ID3") {
        return true;
    }
    for i in 0..buf.len().saturating_sub(1) {
        if buf[i] == 0xff && (buf[i + 1] & 0xe0) == 0xe0 {
            return true;
        }
    }
    false
}

pub fn get_silent_mp3_buffer() -> Vec<u8> {
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

pub fn generate_sec_ms_gec() -> String {
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

pub fn generate_muid() -> String {
    let mut hasher = Sha256::new();
    hasher.update(chrono::Utc::now().to_rfc3339().as_bytes());
    hasher.update(&tokio::time::Instant::now().elapsed().as_nanos().to_le_bytes());
    let hex_val = hex::encode(hasher.finalize());
    hex_val[..32].to_uppercase()
}

fn build_edge_request(base_ws: &str, is_msedge_api: bool, conn_id: &str) -> Option<tokio_tungstenite::tungstenite::handshake::client::Request> {
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

    let mut req = url_str.into_client_request().ok()?;
    let h = req.headers_mut();
    let muid = generate_muid();
    if let Ok(cookie_val) = HeaderValue::from_str(&format!("muid={muid};")) {
        h.insert("Cookie", cookie_val);
    }
    h.insert("Pragma", HeaderValue::from_static("no-cache"));
    h.insert("Cache-Control", HeaderValue::from_static("no-cache"));
    h.insert("User-Agent", HeaderValue::from_static("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68"));
    h.insert("Origin", HeaderValue::from_static("chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold"));
    h.insert("Sec-WebSocket-Version", HeaderValue::from_static("13"));
    h.insert("Accept-Encoding", HeaderValue::from_static("gzip, deflate, br, zstd"));
    h.insert("Accept-Language", HeaderValue::from_static("en-US,en;q=0.9"));
    Some(req)
}

fn detect_voice_lang(voice_name: &str) -> &'static str {
    if voice_name.starts_with("en-") {
        "en-US"
    } else if voice_name.starts_with("zh-HK") {
        "zh-HK"
    } else if voice_name.starts_with("zh-TW") {
        "zh-TW"
    } else {
        "zh-CN"
    }
}

pub async fn synthesize_via_edge_tts(
    chunk: &str,
    voice_name: &str,
    pitch: &str,
    rate: &str,
) -> Option<Vec<u8>> {
    let _ = rustls::crypto::ring::default_provider().install_default();

    let cfg_app = crate::config::current_config();
    let configured_ws = cfg_app.endpoints.edge_tts_ws_url.trim();

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

    let escaped = chunk.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
    let lang = detect_voice_lang(voice_name);

    for (base_ws, is_msedge_api) in candidate_urls {
        let mut hasher = Sha256::new();
        hasher.update(chrono::Utc::now().to_rfc3339().as_bytes());
        hasher.update(&tokio::time::Instant::now().elapsed().as_nanos().to_le_bytes());
        let hex_val = hex::encode(hasher.finalize());
        let conn_id = &hex_val[..32];
        let req_id = &hex_val[..32];

        let Some(req) = build_edge_request(base_ws, is_msedge_api, conn_id) else {
            continue;
        };

        let connect_res = tokio::time::timeout(std::time::Duration::from_millis(4000), connect_async(req)).await;
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
                    Ok(Message::Text(txt)) if txt.contains("Path:turn.end") => break,
                    _ => {}
                }
            }
        };

        if tokio::time::timeout(std::time::Duration::from_secs(12), timeout_task).await.is_ok()
            && is_valid_mp3_buffer(&audio_bytes)
        {
            return Some(audio_bytes);
        }
    }

    None
}
