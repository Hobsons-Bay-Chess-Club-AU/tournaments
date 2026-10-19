use crate::parser::lookup::TopPlayer;
use chrono::Utc;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TournamentEntry {
    pub data: IndexMap<String, String>,
    pub path: String,
    pub category: String,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub top_players: Vec<TopPlayer>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlayerTournamentInfo {
    pub tournament: String,
    pub score: f64,
    pub name: String,
    #[serde(rename = "totalRounds")]
    pub total_rounds: Value,
    #[serde(rename = "ratingType")]
    pub rating_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct PlayerPoints {
    pub standard: f64,
    pub rapid: f64,
    pub blitz: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LeaderboardPlayer {
    pub name: String,
    pub id: String,
    #[serde(rename = "fideId")]
    pub fide_id: String,
    pub gender: String,
    pub href: String,
    #[serde(rename = "tournamentCount")]
    pub tournament_count: usize,
    pub tournaments: Vec<PlayerTournamentInfo>,
    pub points: PlayerPoints,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryLeaderboardFile {
    #[serde(rename = "generatedAt")]
    pub generated_at: String,
    pub year: String,
    pub count: usize,
    #[serde(rename = "totalTournaments")]
    pub total_tournaments: usize,
    pub players: Vec<LeaderboardPlayer>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedLeaderboardFile {
    #[serde(rename = "generatedAt")]
    pub generated_at: String,
    pub year: String,
    pub count: usize,
    #[serde(rename = "seniorCount")]
    pub senior_count: usize,
    #[serde(rename = "juniorCount")]
    pub junior_count: usize,
    #[serde(rename = "totalTournaments")]
    pub total_tournaments: usize,
    pub players: Vec<LeaderboardPlayer>,
}

pub struct LeaderboardOutputs {
    pub tournaments: Vec<TournamentEntry>,
    pub total_tournaments: usize,
    pub senior_players: CategoryLeaderboardFile,
    pub junior_players: CategoryLeaderboardFile,
    pub unified_players: UnifiedLeaderboardFile,
}

pub fn get_tournament_rating_type(metadata: &IndexMap<String, String>) -> String {
    let tour_name = metadata
        .get("Tournament Name")
        .map(|s| s.to_lowercase())
        .unwrap_or_default();
    let time_ctrl = metadata
        .get("Time Control")
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    if tour_name.contains("blitz") || time_ctrl.contains("blitz") {
        "blitz".to_string()
    } else if tour_name.contains("rapid") || time_ctrl.contains("rapid") {
        "rapid".to_string()
    } else {
        "standard".to_string()
    }
}

pub fn is_current_year_tournament(metadata: &IndexMap<String, String>, current_year: &str) -> bool {
    let check_fields = [
        "Date",
        "Date Begin",
        "Date End",
        "Start Date",
        "End Date",
        "Tournament Name",
    ];
    for field in &check_fields {
        if let Some(val) = metadata.get(*field) {
            if val.contains(current_year) {
                return true;
            }
        }
    }
    false
}

#[derive(Debug, Clone)]
struct AccumulatedPlayer {
    name: String,
    id: String,
    fide_id: String,
    gender: String,
    href: String,
    tournaments: Vec<PlayerTournamentInfo>,
    points: PlayerPoints,
}

pub fn generate_leaderboards(www_dir: &Path) -> Result<LeaderboardOutputs, Box<dyn std::error::Error>> {
    generate_leaderboards_for_year(www_dir, None)
}

pub fn generate_leaderboards_for_year(
    www_dir: &Path,
    target_year: Option<&str>,
) -> Result<LeaderboardOutputs, Box<dyn std::error::Error>> {
    let current_year = target_year
        .map(|s| s.to_string())
        .unwrap_or_else(|| Utc::now().format("%Y").to_string());
    let generated_at = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    // 1. Scan for tournament folders in www_dir (or www* subfolders)
    let mut tournament_entries = Vec::new();
    let mut candidate_folders = Vec::new();

    if let Ok(entries) = fs::read_dir(www_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if name.starts_with("www") || path.join("data.json").exists() {
                    candidate_folders.push(path);
                }
            }
        }
    }
    candidate_folders.sort();

    let mut senior_map: HashMap<String, AccumulatedPlayer> = HashMap::new();
    let mut junior_map: HashMap<String, AccumulatedPlayer> = HashMap::new();
    let mut current_year_tournaments = HashSet::new();

    for folder in &candidate_folders {
        let data_path = folder.join("data.json");
        if !data_path.exists() {
            continue;
        }

        let content = match fs::read_to_string(&data_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let data: Value = match serde_json::from_str(&content) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let folder_name = folder
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let rel_path = format!("{}/data.json", folder_name);

        let mut meta = IndexMap::new();
        if let Some(m) = data.get("metadata").and_then(|v| v.as_object()) {
            for (k, v) in m {
                if let Some(s) = v.as_str() {
                    meta.insert(k.clone(), s.to_string());
                }
            }
        }

        let category = data
            .get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("Junior")
            .to_string();

        let top_players: Vec<TopPlayer> = data
            .get("top_players")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default();

        let entry = TournamentEntry {
            data: meta.clone(),
            path: rel_path.clone(),
            category: category.clone(),
            top_players,
        };
        tournament_entries.push(entry);

        if !is_current_year_tournament(&meta, &current_year) {
            continue;
        }

        current_year_tournaments.insert(rel_path.clone());
        let rating_type = get_tournament_rating_type(&meta);
        let tour_title = meta
            .get("Tournament Name")
            .cloned()
            .unwrap_or_else(|| "Unknown Tournament".to_string());
        let total_rounds = meta
            .get("Rounds")
            .map(|s| Value::String(s.clone()))
            .unwrap_or_else(|| Value::from(0));

        // Extract standings points map
        let mut standings_points: HashMap<String, f64> = HashMap::new();
        if let Some(standings_page) = data.get("page").and_then(|p| p.get("standings.html")) {
            if let Some(first_table) = standings_page.get("tables").and_then(|t| t.get(0)) {
                if let Some(rows) = first_table.get("rows").and_then(|r| r.as_array()) {
                    for row in rows {
                        let pts = row
                            .get("Pts")
                            .and_then(|v| {
                                if let Some(s) = v.as_str() {
                                    s.parse::<f64>().ok()
                                } else {
                                    v.as_f64()
                                }
                            })
                            .unwrap_or(0.0);

                        let p_name = row
                            .get("Player")
                            .and_then(|p| {
                                if let Some(s) = p.as_str() {
                                    Some(s.trim().to_string())
                                } else {
                                    p.get("playerName").and_then(|n| n.as_str()).map(|n| n.trim().to_string())
                                }
                            });

                        if let Some(name) = p_name {
                            if !name.is_empty() {
                                standings_points.insert(name, pts);
                            }
                        }
                    }
                }
            }
        }

        // Extract unique players from standings table
        let mut player_objects = Vec::new();
        if let Some(standings_page) = data.get("page").and_then(|p| p.get("standings.html")) {
            if let Some(first_table) = standings_page.get("tables").and_then(|t| t.get(0)) {
                if let Some(rows) = first_table.get("rows").and_then(|r| r.as_array()) {
                    for row in rows {
                        if let Some(p_obj) = row.get("Player").and_then(|p| p.as_object()) {
                            let name = p_obj.get("playerName").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
                            let id = p_obj.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            let gender = p_obj.get("gender").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            let href = p_obj.get("href").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            let fide_id = p_obj.get("fideId").and_then(|v| v.as_str()).unwrap_or("").to_string();

                            if !name.is_empty() {
                                player_objects.push((name, id, fide_id, gender, href));
                            }
                        }
                    }
                }
            }
        }

        let target_map = if category == "Senior" {
            &mut senior_map
        } else {
            &mut junior_map
        };

        for (name, id, fide_id, gender, href) in player_objects {
            let score = standings_points.get(&name).copied().unwrap_or(0.0);
            let tour_info = PlayerTournamentInfo {
                tournament: rel_path.clone(),
                score,
                name: tour_title.clone(),
                total_rounds: total_rounds.clone(),
                rating_type: rating_type.clone(),
            };

            let entry = target_map.entry(name.clone()).or_insert_with(|| AccumulatedPlayer {
                name,
                id,
                fide_id,
                gender,
                href,
                tournaments: Vec::new(),
                points: PlayerPoints::default(),
            });

            entry.tournaments.push(tour_info);
            match rating_type.as_str() {
                "blitz" => entry.points.blitz += score,
                "rapid" => entry.points.rapid += score,
                _ => entry.points.standard += score,
            }
        }
    }

    let total_tournaments = current_year_tournaments.len();

    // 2. Build senior players array
    let mut senior_players = Vec::new();
    for (_, p) in senior_map {
        let mut unique_tours = HashSet::new();
        for t in &p.tournaments {
            unique_tours.insert(t.tournament.clone());
        }
        senior_players.push(LeaderboardPlayer {
            name: p.name,
            id: p.id,
            fide_id: p.fide_id,
            gender: p.gender,
            href: p.href,
            tournament_count: unique_tours.len(),
            tournaments: p.tournaments,
            points: p.points,
        });
    }
    senior_players.sort_by(|a, b| a.name.cmp(&b.name));

    // 3. Build junior players array
    let mut junior_players = Vec::new();
    for (_, p) in junior_map {
        let mut unique_tours = HashSet::new();
        for t in &p.tournaments {
            unique_tours.insert(t.tournament.clone());
        }
        junior_players.push(LeaderboardPlayer {
            name: p.name,
            id: p.id,
            fide_id: p.fide_id,
            gender: p.gender,
            href: p.href,
            tournament_count: unique_tours.len(),
            tournaments: p.tournaments,
            points: p.points,
        });
    }
    junior_players.sort_by(|a, b| a.name.cmp(&b.name));

    // 4. Combine into unified players
    let mut unified_map: HashMap<String, LeaderboardPlayer> = HashMap::new();

    for p in &senior_players {
        unified_map.insert(p.name.clone(), p.clone());
    }

    for p in &junior_players {
        if let Some(existing) = unified_map.get_mut(&p.name) {
            if existing.id.is_empty() && !p.id.is_empty() {
                existing.id = p.id.clone();
            }
            if existing.fide_id.is_empty() && !p.fide_id.is_empty() {
                existing.fide_id = p.fide_id.clone();
            }
            if existing.gender.is_empty() && !p.gender.is_empty() {
                existing.gender = p.gender.clone();
            }
            if existing.href.is_empty() && !p.href.is_empty() {
                existing.href = p.href.clone();
            }

            // Merge tournaments deduplicated
            let mut by_tour: HashMap<String, PlayerTournamentInfo> = HashMap::new();
            for t in &existing.tournaments {
                by_tour.insert(t.tournament.clone(), t.clone());
            }
            for t in &p.tournaments {
                let better = match by_tour.get(&t.tournament) {
                    Some(cur) => if t.score > cur.score { t.clone() } else { cur.clone() },
                    None => t.clone(),
                };
                by_tour.insert(t.tournament.clone(), better);
            }
            existing.tournaments = by_tour.into_values().collect();
            existing.tournaments.sort_by(|a, b| a.tournament.cmp(&b.tournament));
            existing.tournament_count = existing.tournaments.len();

            existing.points.standard += p.points.standard;
            existing.points.rapid += p.points.rapid;
            existing.points.blitz += p.points.blitz;
        } else {
            unified_map.insert(p.name.clone(), p.clone());
        }
    }

    let mut unified_players: Vec<LeaderboardPlayer> = unified_map.into_values().collect();
    unified_players.sort_by(|a, b| a.name.cmp(&b.name));

    let senior_file = CategoryLeaderboardFile {
        generated_at: generated_at.clone(),
        year: current_year.clone(),
        count: senior_players.len(),
        total_tournaments,
        players: senior_players,
    };

    let junior_file = CategoryLeaderboardFile {
        generated_at: generated_at.clone(),
        year: current_year.clone(),
        count: junior_players.len(),
        total_tournaments,
        players: junior_players,
    };

    let unified_file = UnifiedLeaderboardFile {
        generated_at: generated_at.clone(),
        year: current_year.clone(),
        count: unified_players.len(),
        senior_count: senior_file.count,
        junior_count: junior_file.count,
        total_tournaments,
        players: unified_players,
    };

    // Write all 4 files
    let tour_json_path = www_dir.join("tournament.json");
    let senior_path = www_dir.join("senior-players.json");
    let junior_path = www_dir.join("junior-players.json");
    let players_path = www_dir.join("players.json");

    fs::write(&tour_json_path, serde_json::to_string_pretty(&tournament_entries)?)?;
    fs::write(&senior_path, serde_json::to_string_pretty(&senior_file)?)?;
    fs::write(&junior_path, serde_json::to_string_pretty(&junior_file)?)?;
    fs::write(&players_path, serde_json::to_string_pretty(&unified_file)?)?;

    Ok(LeaderboardOutputs {
        tournaments: tournament_entries,
        total_tournaments,
        senior_players: senior_file,
        junior_players: junior_file,
        unified_players: unified_file,
    })
}

/// Process all tournament folders in `www_dir`, update `tournament.json`, and regenerate leaderboards.
pub fn process_all_tournaments(
    www_dir: &Path,
) -> Result<(Vec<crate::TournamentProcessResult>, LeaderboardOutputs), Box<dyn std::error::Error>> {
    let mut results = Vec::new();
    let mut dirs = Vec::new();

    if let Ok(entries) = fs::read_dir(www_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("www") || entry.path().join("index.html").exists() {
                    dirs.push(entry.path());
                }
            }
        }
    }
    dirs.sort();

    let options = crate::ProcessOptions {
        write_files: true,
        convert_php: true,
        php_threshold_seconds: 30.0,
    };

    for dir in &dirs {
        match crate::process_folder(dir, &options) {
            Ok(res) => results.push(res),
            Err(e) => {
                eprintln!("[Prepare Data] Warning: failed to parse {}: {e}", dir.display());
            }
        }
    }

    let leaderboards = generate_leaderboards(www_dir)?;
    Ok((results, leaderboards))
}

/// Process a single tournament directory, update `tournament.json`, and regenerate leaderboards.
pub fn update_single_tournament(
    tournament_dir: &Path,
    www_dir: &Path,
) -> Result<crate::TournamentProcessResult, Box<dyn std::error::Error>> {
    let options = crate::ProcessOptions {
        write_files: true,
        convert_php: true,
        php_threshold_seconds: 30.0,
    };

    let result = crate::process_folder(tournament_dir, &options)?;

    // Update existing tournament.json preserving other tournaments
    let tour_json_path = www_dir.join("tournament.json");
    let mut tournaments: Vec<TournamentEntry> = if tour_json_path.exists() {
        let content = fs::read_to_string(&tour_json_path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    let folder_name = tournament_dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("tournament");

    let metadata_map: IndexMap<String, String> = result
        .data
        .get("metadata")
        .and_then(|m| serde_json::from_value(m.clone()).ok())
        .unwrap_or_default();

    let top_players: Vec<TopPlayer> = result
        .data
        .get("top_players")
        .and_then(|tp| serde_json::from_value(tp.clone()).ok())
        .unwrap_or_default();

    let new_entry = TournamentEntry {
        data: metadata_map,
        path: format!("{}/data.json", folder_name),
        category: result.category.clone(),
        top_players,
    };

    if let Some(pos) = tournaments.iter().position(|t| t.path == new_entry.path) {
        tournaments[pos] = new_entry;
    } else {
        tournaments.push(new_entry);
    }

    fs::write(&tour_json_path, serde_json::to_string_pretty(&tournaments)?)?;

    // Regenerate unique player files
    let _ = generate_leaderboards(www_dir)?;

    Ok(result)
}

