use serde_json::Value;
use std::sync::OnceLock;

static VOICES_CACHE: OnceLock<Value> = OnceLock::new();

pub fn get_preset_voices() -> Value {
    VOICES_CACHE
        .get_or_init(|| {
            serde_json::from_str(include_str!("voices.json"))
                .unwrap_or_else(|_| serde_json::json!([]))
        })
        .clone()
}
