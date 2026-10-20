use serde_json::Value;
use std::io::Write;

pub fn generate_valid_epub_bytes(
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
            ch_num, ch_num, esc(ch_title), filename
        ));
    }

    let opf = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<package xmlns=\"http://www.idpf.org/2007/opf\" unique-identifier=\"BookId\" version=\"2.0\">\n  <metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n    <dc:title>{}</dc:title>\n    <dc:creator>{}</dc:creator>\n    <dc:publisher>{}</dc:publisher>\n    <dc:description>{}</dc:description>\n    <dc:language>zh-CN</dc:language>\n  </metadata>\n  <manifest>\n    <item id=\"ncx\" href=\"toc.ncx\" media-type=\"application/x-dtbncx+xml\"/>\n{}</manifest>\n  <spine toc=\"ncx\">\n{}</spine>\n</package>",
        esc(title), esc(author), esc(publisher), esc(description), manifest_items, spine_items
    );
    zip.start_file("OEBPS/content.opf", deflated).ok()?;
    zip.write_all(opf.as_bytes()).ok()?;

    let ncx = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<ncx xmlns=\"http://www.daisy.org/z3986/2005/ncx/\" version=\"2005-1\">\n  <head><meta name=\"dtb:uid\" content=\"luminaread\"/></head>\n  <docTitle><text>{}</text></docTitle>\n  <navMap>\n{}</navMap>\n</ncx>",
        esc(title), nav_points
    );
    zip.start_file("OEBPS/toc.ncx", deflated).ok()?;
    zip.write_all(ncx.as_bytes()).ok()?;

    let cursor = zip.finish().ok()?;
    Some(cursor.into_inner())
}

pub fn build_curated_discovery_catalog() -> Vec<Value> {
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
