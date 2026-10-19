use md5::{Digest, Md5};
use serde_json::Value;

/// Checks if a string key is an ECMAScript integer index (array index).
/// According to ECMAScript specification:
/// An integer index is a String value that is an element of the set of canonical
/// numeric Strings (i.e. "0", or positive integers without leading zeros up to 2^32 - 2).
fn is_ecma_integer_index(s: &str) -> Option<u32> {
    if s == "0" {
        return Some(0);
    }
    if s.starts_with('0') || s.is_empty() {
        return None;
    }
    if let Ok(val) = s.parse::<u32>() {
        if val < u32::MAX - 1 {
            return Some(val);
        }
    }
    None
}

/// Normalizes JSON object keys to strictly follow ECMAScript [[OwnPropertyKeys]]
/// specification order:
/// 1. Integer keys in ascending numeric order.
/// 2. All other string keys in their original insertion order.
pub fn normalize_to_ecma_order(val: &Value) -> Value {
    match val {
        Value::Object(map) => {
            let mut int_keys: Vec<(u32, &String, &Value)> = Vec::new();
            let mut other_keys: Vec<(&String, &Value)> = Vec::new();

            for (k, v) in map {
                if let Some(idx) = is_ecma_integer_index(k) {
                    int_keys.push((idx, k, v));
                } else {
                    other_keys.push((k, v));
                }
            }

            int_keys.sort_by_key(|&(idx, _, _)| idx);

            let mut new_map = serde_json::Map::new();
            for (_, k, v) in int_keys {
                new_map.insert(k.clone(), normalize_to_ecma_order(v));
            }
            for (k, v) in other_keys {
                new_map.insert(k.clone(), normalize_to_ecma_order(v));
            }

            Value::Object(new_map)
        }
        Value::Array(arr) => Value::Array(arr.iter().map(normalize_to_ecma_order).collect()),
        _ => val.clone(),
    }
}

/// Calculate MD5 hash of a tournament data object excluding transient fields.
/// Exactly matches `calculateDataHash` in `src/vega-parser.mjs` while preserving
/// the exact insertion order of non-excluded keys in ECMAScript order.
pub fn calculate_data_hash(data: &Value) -> String {
    let filtered = match data.as_object() {
        Some(obj) => {
            let mut new_map = serde_json::Map::new();
            for (k, v) in obj {
                if k != "generatedAt"
                    && k != "md5Hash"
                    && k != "cleanData"
                    && k != "cleanMd5Hash"
                    && k != "folderName"
                    && k != "folderPath"
                {
                    new_map.insert(k.clone(), v.clone());
                }
            }
            Value::Object(new_map)
        }
        None => data.clone(),
    };

    let normalized = normalize_to_ecma_order(&filtered);
    let json_str = serde_json::to_string(&normalized).unwrap_or_default();
    let mut hasher = Md5::new();
    hasher.update(json_str.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}
