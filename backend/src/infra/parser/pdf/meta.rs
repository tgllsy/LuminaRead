use serde_json::Value;

pub fn is_valid_natural_text(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return false;
    }

    let mut cjk_count = 0usize;
    let mut alpha_count = 0usize;
    let mut digit_count = 0usize;
    let mut punctuation_count = 0usize;
    let mut total_chars = 0usize;

    for c in trimmed.chars() {
        total_chars += 1;
        if c == '\u{FFFD}' {
            return false;
        }
        if ('\u{4E00}'..='\u{9FFF}').contains(&c)
            || ('\u{3400}'..='\u{4DBF}').contains(&c)
            || ('\u{20000}'..='\u{2A6DF}').contains(&c)
        {
            cjk_count += 1;
        } else if c.is_ascii_alphabetic() {
            alpha_count += 1;
        } else if c.is_ascii_digit() {
            digit_count += 1;
        } else if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
            // whitespace
        } else if "，。！？；：“”‘’（）《》、—…,.!?;:'\"()-/·[]{}<>".contains(c) {
            punctuation_count += 1;
        }
    }

    if total_chars == 0 {
        return false;
    }

    if cjk_count > 0 {
        let valid = cjk_count + alpha_count + digit_count + punctuation_count;
        return (valid as f32 / total_chars as f32) >= 0.75;
    }

    if alpha_count >= 15 {
        let valid = alpha_count + digit_count + punctuation_count;
        if (valid as f32 / total_chars as f32) < 0.75 {
            return false;
        }
        let words: Vec<&str> = trimmed.split_whitespace().collect();
        let long_words = words.iter().filter(|w| w.len() >= 3).count();
        return long_words >= 2;
    }

    false
}

pub fn normalize_pdf_page_paragraphs(raw_page: &str) -> Vec<String> {
    if !is_valid_natural_text(raw_page) {
        return Vec::new();
    }

    let mut paras = Vec::new();
    let mut current = String::new();
    for line in raw_page.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if !current.is_empty() {
                if is_valid_natural_text(&current) {
                    paras.push(current.clone());
                }
                current.clear();
            }
            continue;
        }
        if current.is_empty() {
            current.push_str(trimmed);
        } else {
            let ends_sentence = current.ends_with('。')
                || current.ends_with('！')
                || current.ends_with('？')
                || current.ends_with('.')
                || current.ends_with('!')
                || current.ends_with('?')
                || current.ends_with('”')
                || current.ends_with('"')
                || crate::infra::parser::security::is_chapter_heading(trimmed);
            if ends_sentence && current.chars().count() >= 28 {
                if is_valid_natural_text(&current) {
                    paras.push(current.clone());
                }
                current.clear();
                current.push_str(trimmed);
            } else {
                let last_ascii = current.chars().last().map(|c| c.is_ascii_alphanumeric()).unwrap_or(false);
                let first_ascii = trimmed.chars().next().map(|c| c.is_ascii_alphanumeric()).unwrap_or(false);
                if last_ascii && first_ascii {
                    current.push(' ');
                }
                current.push_str(trimmed);
            }
        }
    }
    if !current.is_empty() && is_valid_natural_text(&current) {
        paras.push(current);
    }
    paras
}

pub fn build_pdf_meta_json(book_id: &str, chapters: &[Value]) -> Value {
    let mut pages = Vec::new();
    let mut scanned_count = 0usize;

    for (ch_idx, ch) in chapters.iter().enumerate() {
        let content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");
        let mut cur_page_num: Option<usize> = None;
        let mut cur_paras: Vec<&str> = Vec::new();

        for para in content.split("\n\n") {
            let trimmed = para.trim();
            if let Some(num_str) = trimmed.strip_prefix("[[PDF_PAGE:").and_then(|s| s.strip_suffix("]]")) {
                if let Some(prev_num) = cur_page_num {
                    let page_text = cur_paras.join("\n\n");
                    let is_scanned = !is_valid_natural_text(&page_text);
                    if is_scanned {
                        scanned_count += 1;
                    }
                    pages.push(serde_json::json!({
                        "page_num": prev_num,
                        "chapter_index": ch_idx,
                        "text": if is_scanned { "" } else { &page_text },
                        "char_count": if is_scanned { 0 } else { page_text.chars().count() },
                        "has_image": true,
                        "is_scanned": is_scanned,
                    }));
                    cur_paras.clear();
                }
                cur_page_num = num_str.trim().parse::<usize>().ok();
            } else if !trimmed.is_empty() {
                cur_paras.push(trimmed);
            }
        }

        if let Some(last_num) = cur_page_num {
            let page_text = cur_paras.join("\n\n");
            let is_scanned = !is_valid_natural_text(&page_text);
            if is_scanned {
                scanned_count += 1;
            }
            pages.push(serde_json::json!({
                "page_num": last_num,
                "chapter_index": ch_idx,
                "text": if is_scanned { "" } else { &page_text },
                "char_count": if is_scanned { 0 } else { page_text.chars().count() },
                "has_image": true,
                "is_scanned": is_scanned,
            }));
        }
    }

    if pages.is_empty() {
        let first_text = chapters
            .first()
            .and_then(|c| c.get("content"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let is_scanned = !is_valid_natural_text(first_text);
        if is_scanned {
            scanned_count += 1;
        }
        pages.push(serde_json::json!({
            "page_num": 1,
            "chapter_index": 0,
            "text": if is_scanned { "" } else { first_text },
            "char_count": if is_scanned { 0 } else { first_text.chars().count() },
            "has_image": true,
            "is_scanned": is_scanned,
        }));
    }

    let is_scanned_book = !pages.is_empty() && (scanned_count * 10 >= pages.len() * 7);

    serde_json::json!({
        "book_id": book_id,
        "page_count": pages.len(),
        "pages": pages,
        "is_scanned_book": is_scanned_book,
    })
}
