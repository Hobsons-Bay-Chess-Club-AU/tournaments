//! Core tournament parsing, leaderboard calculation, and sync engine for HBCC.

pub mod clean;
pub mod github;
pub mod hash;
pub mod leaderboards;
pub mod parser;
pub mod php;
pub mod ref_data;
pub mod supabase;

use crate::clean::transform_to_normalized_data;
use crate::hash::calculate_data_hash;
use crate::parser::lookup::{
    build_player_lookup, enrich_tables_with_player_data, extract_top_players,
};
use crate::parser::menu::extract_menu_structure;
use crate::parser::page::process_html_content;
use crate::parser::tourstat::{extract_metadata, extract_minimal_metadata_from_index};
use crate::php::convert_tournament_php_files;
use crate::ref_data::is_senior_player;
use chrono::Utc;
use indexmap::IndexMap;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::sync::LazyLock;

static RE_JUNIOR: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(junior|juniors|rookie|rookies)\b").unwrap()
});

#[derive(Debug, Clone)]
pub struct ProcessOptions {
    pub write_files: bool,
    pub convert_php: bool,
    pub php_threshold_seconds: f64,
}

impl Default for ProcessOptions {
    fn default() -> Self {
        Self {
            write_files: false,
            convert_php: true,
            php_threshold_seconds: 30.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TournamentProcessResult {
    pub success: bool,
    pub folder: String,
    pub tournament_name: String,
    pub category: String,
    pub player_count: usize,
    pub md5_hash: String,
    pub data: Value,
    pub data_clean: Value,
}

/// Process a single tournament directory and produce full data and clean data JSON.
pub fn process_folder(
    folder_dir: &Path,
    options: &ProcessOptions,
) -> Result<TournamentProcessResult, Box<dyn std::error::Error>> {
    if !folder_dir.exists() {
        return Err(format!("Tournament directory does not exist: {}", folder_dir.display()).into());
    }

    if options.convert_php {
        let _ = convert_tournament_php_files(folder_dir, options.php_threshold_seconds);
    }

    let folder_name = folder_dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Collect all HTML files
    let mut html_files = Vec::new();
    for entry in fs::read_dir(folder_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext.to_string_lossy().eq_ignore_ascii_case("html") {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        html_files.push(name.to_string());
                    }
                }
            }
        }
    }
    html_files.sort();

    // First pass: parse HTML pages
    let mut page_map = IndexMap::new();
    for file in &html_files {
        let file_path = folder_dir.join(file);
        if let Ok(content) = fs::read_to_string(&file_path) {
            let page_data = process_html_content(&content, file);
            page_map.insert(file.clone(), page_data);
        }
    }

    // Second pass: player lookup and table enrichment
    let player_lookup = build_player_lookup(&page_map, &folder_name);
    enrich_tables_with_player_data(&mut page_map, &player_lookup);
    let top_players = extract_top_players(&page_map);

    // Menu extraction
    let mut menu = Vec::new();
    let index_path = folder_dir.join("index.html");
    if let Ok(index_content) = fs::read_to_string(&index_path) {
        menu = extract_menu_structure(&index_content);
    }

    // Metadata extraction
    let tourstat_path = folder_dir.join("tourstat.html");
    let mut metadata = if tourstat_path.exists() {
        let content = fs::read_to_string(&tourstat_path)?;
        extract_metadata(&content).unwrap_or_default()
    } else if index_path.exists() {
        let content = fs::read_to_string(&index_path)?;
        extract_minimal_metadata_from_index(&content)
    } else {
        IndexMap::new()
    };

    // Category determination
    let tour_name = metadata
        .get("Tournament Name")
        .cloned()
        .unwrap_or_default();
    let tour_name_lower = tour_name.to_lowercase();
    let folder_lower = folder_name.to_lowercase();
    let is_junior = RE_JUNIOR.is_match(&tour_name_lower) || RE_JUNIOR.is_match(&folder_lower);

    let players_val = page_map
        .get("index.html")
        .and_then(|p| p.tables.first())
        .map(|t| json!(t.rows))
        .unwrap_or(Value::Null);

    let mut category = "Junior".to_string();
    if !is_junior {
        if let Some(arr) = players_val.as_array() {
            for row in arr {
                let mut is_senior = false;
                if let Some(p) = row.get("Player") {
                    if let Some(s) = p.as_str() {
                        if is_senior_player(s) {
                            is_senior = true;
                        }
                    } else if let Some(obj) = p.as_object() {
                        if let Some(name) = obj.get("playerName").and_then(|v| v.as_str()) {
                            if is_senior_player(name) {
                                is_senior = true;
                            }
                        }
                    }
                }
                if is_senior {
                    category = "Senior".to_string();
                    break;
                }
            }
        }
    }

    metadata.insert("category".to_string(), category.clone());

    let generated_at = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    // Build raw data object matching JS structure
    let mut raw_data = IndexMap::new();
    raw_data.insert("generatedAt".to_string(), Value::String(generated_at.clone()));
    raw_data.insert("page".to_string(), serde_json::to_value(&page_map)?);
    raw_data.insert("top_players".to_string(), serde_json::to_value(&top_players)?);
    raw_data.insert("playerLookup".to_string(), serde_json::to_value(&player_lookup)?);
    raw_data.insert("menu".to_string(), serde_json::to_value(&menu)?);
    raw_data.insert("players".to_string(), players_val.clone());
    raw_data.insert("category".to_string(), Value::String(category.clone()));
    raw_data.insert("metadata".to_string(), serde_json::to_value(&metadata)?);

    let data_val_raw = Value::Object(raw_data.into_iter().collect::<serde_json::Map<_, _>>());
    let mut data_val = crate::hash::normalize_to_ecma_order(&data_val_raw);

    // Calculate MD5 hash
    let md5_hash = calculate_data_hash(&data_val);
    data_val["md5Hash"] = Value::String(md5_hash.clone());

    // Generate clean data
    let clean_data_raw = transform_to_normalized_data(
        &page_map,
        &player_lookup,
        &metadata,
        &menu,
        &category,
        &generated_at,
    );
    let mut clean_data = crate::hash::normalize_to_ecma_order(&clean_data_raw);
    let clean_hash = calculate_data_hash(&clean_data);
    clean_data["md5Hash"] = Value::String(clean_hash.clone());

    // Attach remaining fields to data_val
    data_val["cleanData"] = clean_data.clone();
    data_val["cleanMd5Hash"] = Value::String(clean_hash);
    data_val["folderName"] = Value::String(folder_name.clone());
    data_val["folderPath"] = Value::String(folder_dir.to_string_lossy().to_string());

    if options.write_files {
        let output_file = folder_dir.join("data.json");
        let clean_output_file = folder_dir.join("data_clean.json");
        fs::write(&output_file, serde_json::to_string_pretty(&data_val)?)?;
        fs::write(&clean_output_file, serde_json::to_string_pretty(&clean_data)?)?;
    }

    let player_count = players_val.as_array().map(|a| a.len()).unwrap_or(0);

    Ok(TournamentProcessResult {
        success: true,
        folder: folder_name,
        tournament_name: tour_name,
        category,
        player_count,
        md5_hash,
        data: data_val,
        data_clean: clean_data,
    })
}
