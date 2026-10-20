use std::collections::HashMap;

pub fn normalize_api_prefix(raw: &str) -> String {
    let t = raw.trim().trim_end_matches('/');
    if t.is_empty() || t == "/" {
        "/api".to_string()
    } else if t.starts_with('/') {
        t.to_string()
    } else {
        format!("/{}", t)
    }
}

pub fn parse_bool(s: &str) -> bool {
    matches!(
        s.trim().to_ascii_lowercase().as_str(),
        "true" | "1" | "yes" | "on"
    )
}

pub fn escape_toml_str(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

pub fn clean_toml_value(raw: &str) -> String {
    let t = raw.trim();
    if let Some(stripped) = t.strip_prefix('"') {
        let mut out = String::new();
        let mut escaped = false;
        for ch in stripped.chars() {
            if escaped {
                out.push(ch);
                escaped = false;
            } else if ch == '\\' {
                escaped = true;
            } else if ch == '"' {
                return out;
            } else {
                out.push(ch);
            }
        }
        return out;
    }
    if let Some(stripped) = t.strip_prefix('\'') {
        if let Some(end_quote) = stripped.find('\'') {
            return stripped[..end_quote].to_string();
        }
    }
    // Strip inline comment for unquoted values
    let without_comment = t.split('#').next().unwrap_or(t).trim();
    without_comment.to_string()
}

pub fn parse_simple_toml(content: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mut section = String::new();

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
            continue;
        }
        if line.starts_with('[') && line.ends_with(']') {
            section = line[1..line.len() - 1].trim().to_string();
            continue;
        }
        if let Some((raw_k, raw_v)) = line.split_once('=') {
            let key = raw_k.trim();
            if key.is_empty() {
                continue;
            }
            let val = clean_toml_value(raw_v);
            if !section.is_empty() {
                map.insert(format!("{}.{}", section, key), val);
            } else {
                map.insert(key.to_string(), val);
            }
        }
    }
    map
}
