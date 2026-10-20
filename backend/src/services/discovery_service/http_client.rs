use std::sync::OnceLock;

use super::sanitizer::is_safe_external_url;

static SHARED_HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

pub fn get_shared_http_client() -> &'static reqwest::Client {
    SHARED_HTTP_CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .connect_timeout(std::time::Duration::from_secs(6))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
            .build()
            .unwrap_or_default()
    })
}

pub async fn stream_response_capped(mut resp: reqwest::Response, max_bytes: usize) -> Option<Vec<u8>> {
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

async fn fetch_via_custom_builder(url: &str, proxy: &str, timeout_sec: u64, max_bytes: usize) -> Option<Vec<u8>> {
    let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    let mut builder = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_sec))
        .connect_timeout(std::time::Duration::from_secs(6))
        .user_agent(user_agent);

    if !proxy.is_empty() {
        if let Ok(p) = reqwest::Proxy::all(proxy) {
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

    if !proxy.is_empty() {
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

    None
}

pub async fn http_fetch_bytes(url: &str, proxy: &str, timeout_sec: u64) -> Option<Vec<u8>> {
    if !is_safe_external_url(url) {
        return None;
    }
    let clean_proxy = proxy.trim();
    let max_bytes = 250 * 1024 * 1024;

    if clean_proxy.is_empty() && timeout_sec <= 60 {
        let client = get_shared_http_client();
        if let Ok(resp) = client.get(url).send().await {
            if resp.status().is_success() {
                if let Some(bytes) = stream_response_capped(resp, max_bytes).await {
                    return Some(bytes);
                }
            }
        }
    }

    fetch_via_custom_builder(url, clean_proxy, timeout_sec, max_bytes).await
}

pub async fn http_fetch_text(url: &str, proxy: &str, timeout_sec: u64) -> Option<String> {
    let bytes = http_fetch_bytes(url, proxy, timeout_sec).await?;
    Some(String::from_utf8_lossy(&bytes).into_owned())
}

pub fn find_between<'a>(s: &'a str, start_pat: &str, end_pat: &str) -> Option<&'a str> {
    let s_idx = s.find(start_pat)? + start_pat.len();
    let e_idx = s[s_idx..].find(end_pat)? + s_idx;
    Some(&s[s_idx..e_idx])
}
