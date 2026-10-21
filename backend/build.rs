use flate2::write::GzEncoder;
use flate2::Compression;
use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

fn guess_mime(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "html" | "htm" => "text/html; charset=utf-8",
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" | "map" | "webmanifest" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "wasm" => "application/wasm",
        "txt" | "md" => "text/plain; charset=utf-8",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        "aac" => "audio/aac",
        _ => "application/octet-stream",
    }
}

fn collect_files(base: &Path, dir: &Path, out: &mut Vec<(String, PathBuf, &'static str)>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_files(base, &path, out);
        } else if path.is_file() {
            if let Ok(rel) = path.strip_prefix(base) {
                let rel_str = rel
                    .components()
                    .map(|c| c.as_os_str().to_string_lossy())
                    .collect::<Vec<_>>()
                    .join("/");
                if let Ok(abs) = fs::canonicalize(&path) {
                    out.push((rel_str, abs, guess_mime(&path)));
                }
            }
        }
    }
}

fn main() {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let dist_dir = manifest_dir.join("../frontend/dist");
    let public_dir = manifest_dir.join("../frontend/public");

    println!("cargo:rerun-if-changed={}", dist_dir.display());
    println!("cargo:rerun-if-changed={}", public_dir.display());

    let mut files = Vec::new();
    if dist_dir.exists() {
        collect_files(&dist_dir, &dist_dir, &mut files);
    }

    if !files.iter().any(|(rel, _, _)| rel == "sw.js") {
        let sw_pub = public_dir.join("sw.js");
        if sw_pub.exists() {
            if let Ok(abs) = fs::canonicalize(&sw_pub) {
                files.push(("sw.js".to_string(), abs, "application/javascript; charset=utf-8"));
            }
        }
    }

    files.sort_by(|a, b| a.0.cmp(&b.0));

    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let gz_dir = out_dir.join("embedded_gz");
    let _ = fs::create_dir_all(&gz_dir);

    let dest_path = out_dir.join("embedded_assets.rs");
    let mut f = fs::File::create(&dest_path).expect("Failed to create embedded_assets.rs");

    writeln!(
        f,
        "pub struct EmbeddedAsset {{\n    pub path: &'static str,\n    pub mime: &'static str,\n    pub is_gzipped: bool,\n    pub bytes: &'static [u8],\n}}\n"
    )
    .unwrap();

    writeln!(f, "pub static EMBEDDED_ASSETS: &[EmbeddedAsset] = &[").unwrap();
    for (idx, (rel_path, abs_path, mime)) in files.iter().enumerate() {
        let gz_file = gz_dir.join(format!("asset_{}.gz", idx));
        let raw_len = fs::metadata(abs_path).map(|m| m.len()).unwrap_or(0);

        let mut use_gz = false;
        let is_media = mime.starts_with("audio/") || mime.starts_with("video/");
        if !is_media {
            if let Ok(raw_bytes) = fs::read(abs_path) {
                let mut encoder = GzEncoder::new(Vec::new(), Compression::best());
                if encoder.write_all(&raw_bytes).is_ok() {
                    if let Ok(compressed) = encoder.finish() {
                        if (compressed.len() as u64) < raw_len && fs::write(&gz_file, &compressed).is_ok() {
                            use_gz = true;
                        }
                    }
                }
            }
        }

        let embed_path = if use_gz { &gz_file } else { abs_path };
        let mut embed_str = embed_path.to_string_lossy().replace('\\', "/");
        if embed_str.starts_with("//?/") {
            embed_str = embed_str[4..].to_string();
        }
        writeln!(
            f,
            "    EmbeddedAsset {{ path: {:?}, mime: {:?}, is_gzipped: {}, bytes: include_bytes!({:?}) }},",
            rel_path, mime, use_gz, embed_str
        )
        .unwrap();
    }
    writeln!(f, "];\n").unwrap();

    writeln!(
        f,
        "pub fn get_embedded_asset(path: &str) -> Option<&'static EmbeddedAsset> {{\n    let clean = path.trim_start_matches('/');\n    EMBEDDED_ASSETS.iter().find(|a| a.path == clean)\n}}"
    )
    .unwrap();
}
