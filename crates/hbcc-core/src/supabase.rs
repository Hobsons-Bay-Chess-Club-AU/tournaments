use reqwest::Client;
use serde_json::Value;
use std::path::{Path, PathBuf};

/// Load environment variables from standard locations quietly.
pub fn load_env() {
    let candidates = [
        PathBuf::from(".env"),
        PathBuf::from("ftp-server/.env"),
        PathBuf::from("scripts/.env"),
        PathBuf::from("../.env"),
        PathBuf::from("../ftp-server/.env"),
        PathBuf::from("../scripts/.env"),
    ];

    if let Ok(curr) = std::env::current_exe() {
        if let Some(parent) = curr.parent() {
            let _ = dotenvy::from_path(parent.join(".env"));
            let _ = dotenvy::from_path(parent.join("ftp-server/.env"));
        }
    }

    for path in &candidates {
        if path.exists() {
            let _ = dotenvy::from_path(path);
        }
    }
}

/// Check if Supabase credentials are configured in the environment.
pub fn is_supabase_configured() -> bool {
    load_env();
    let url = std::env::var("SUPABASE_URL")
        .or_else(|_| std::env::var("NEXT_PUBLIC_SUPABASE_URL"))
        .unwrap_or_default();
    let key = std::env::var("SUPABASE_SECRET_KEY")
        .or_else(|_| std::env::var("SUPABASE_ANON_KEY"))
        .or_else(|_| std::env::var("SUPABASE_PUBLISHABLE_KEY"))
        .or_else(|_| std::env::var("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"))
        .unwrap_or_default();

    !url.trim().is_empty() && !key.trim().is_empty()
}

/// Format tournament metadata and full blob for Supabase 'tournaments' table.
pub fn format_tournament_row(
    website_name: &str,
    result: &Value,
    full_data: Option<&Value>,
) -> Value {
    let empty_obj = serde_json::json!({});
    let metadata = result
        .get("metadata")
        .or_else(|| full_data.and_then(|f| f.get("metadata")))
        .unwrap_or(&empty_obj);

    let date_begin = metadata
        .get("Date Begin")
        .or_else(|| metadata.get("Date"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let date_end = metadata
        .get("Date End")
        .or_else(|| metadata.get("End Date"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let ts = if !date_begin.is_empty() {
        let parts: Vec<&str> = date_begin.split('/').collect();
        let reversed: Vec<&str> = parts.into_iter().rev().collect();
        reversed.join("").parse::<i64>().unwrap_or(0)
    } else {
        0
    };

    let year = if !date_end.is_empty() {
        date_end.split('/').last().unwrap_or("").to_string()
    } else if !date_begin.is_empty() {
        date_begin.split('/').last().unwrap_or("").to_string()
    } else {
        String::new()
    };

    let empty_arr = serde_json::json!([]);
    let top_players = result
        .get("top_players")
        .or_else(|| full_data.and_then(|f| f.get("top_players")))
        .unwrap_or(&empty_arr);

    let registered_players = metadata
        .get("Registered Players")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or_else(|| {
            full_data
                .and_then(|f| f.get("players"))
                .and_then(|p| p.as_array())
                .map(|a| a.len())
                .unwrap_or(0)
        });

    let raw_category = result
        .get("category")
        .or_else(|| metadata.get("category"))
        .or_else(|| full_data.and_then(|f| f.get("category")))
        .and_then(|v| v.as_str())
        .unwrap_or("Junior")
        .trim();

    let clean_category = if raw_category.is_empty() {
        "Junior".to_string()
    } else {
        let mut chars = raw_category.chars();
        match chars.next() {
            None => "Junior".to_string(),
            Some(first) => {
                let first_up = first.to_uppercase().to_string();
                let rest_low: String = chars.as_str().to_lowercase();
                format!("{}{}", first_up, rest_low)
            }
        }
    };

    let name = metadata
        .get("Tournament Name")
        .or_else(|| metadata.get("Place"))
        .and_then(|v| v.as_str())
        .unwrap_or(website_name);

    let site = metadata
        .get("Site")
        .or_else(|| metadata.get("Place"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let rounds = metadata
        .get("Rounds")
        .map(|v| match v {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            _ => "0".into(),
        })
        .unwrap_or_else(|| "0".into());

    let arbiter = metadata
        .get("Arbiter(s)")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let data_blob = full_data
        .or_else(|| result.get("data"))
        .unwrap_or(result);

    serde_json::json!({
        "slug": website_name,
        "name": name,
        "path": format!("{}/data.json", website_name),
        "category": clean_category,
        "site": site,
        "date_begin": date_begin,
        "date_end": date_end,
        "year": year,
        "date_ts": ts,
        "rounds": rounds,
        "arbiter": arbiter,
        "status": "completed",
        "player_count": registered_players,
        "top_players": top_players,
        "metadata": metadata,
        "data": data_blob
    })
}

/// Format player master data row for Supabase 'players' table.
pub fn format_player_row(player: &Value, default_category: Option<&str>) -> Value {
    let name = player
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();

    let player_id = player
        .get("id")
        .or_else(|| player.get("player_id"))
        .map(|v| match v {
            Value::String(s) => s.trim().to_string(),
            Value::Number(n) => n.to_string(),
            _ => String::new(),
        })
        .unwrap_or_default();

    let fide_id = player
        .get("fideId")
        .or_else(|| player.get("fide_id"))
        .map(|v| match v {
            Value::String(s) => s.trim().to_string(),
            Value::Number(n) => n.to_string(),
            _ => String::new(),
        })
        .unwrap_or_default();

    let gender = player.get("gender").and_then(|v| v.as_str()).unwrap_or("");
    let href = player.get("href").and_then(|v| v.as_str()).unwrap_or("");
    let category = player
        .get("category")
        .and_then(|v| v.as_str())
        .unwrap_or_else(|| default_category.unwrap_or("Unified"));

    let tournament_count = player
        .get("tournamentCount")
        .and_then(|v| v.as_u64())
        .or_else(|| {
            player
                .get("tournaments")
                .and_then(|v| v.as_array())
                .map(|a| a.len() as u64)
        })
        .unwrap_or(0);

    let default_points = serde_json::json!({
        "standard": 0,
        "rapid": 0,
        "blitz": 0
    });
    let points = player.get("points").unwrap_or(&default_points);

    let empty_arr = serde_json::json!([]);
    let tournaments = player.get("tournaments").unwrap_or(&empty_arr);

    serde_json::json!({
        "name": name,
        "player_id": player_id,
        "fide_id": fide_id,
        "gender": gender,
        "href": href,
        "category": category,
        "tournament_count": tournament_count,
        "points": points,
        "tournaments": tournaments,
        "raw_data": player
    })
}

/// Supabase REST client for synchronizing tournaments and players.
#[derive(Debug, Clone)]
pub struct SupabaseClient {
    pub url: String,
    pub api_key: String,
    pub client: Client,
}

impl SupabaseClient {
    pub fn new(url: &str, api_key: &str) -> Self {
        Self {
            url: url.trim_end_matches('/').to_string(),
            api_key: api_key.trim().to_string(),
            client: Client::new(),
        }
    }

    pub fn from_env() -> Option<Self> {
        load_env();
        let url = std::env::var("SUPABASE_URL")
            .or_else(|_| std::env::var("NEXT_PUBLIC_SUPABASE_URL"))
            .ok()?;
        let key = std::env::var("SUPABASE_SECRET_KEY")
            .or_else(|_| std::env::var("SUPABASE_ANON_KEY"))
            .or_else(|_| std::env::var("SUPABASE_PUBLISHABLE_KEY"))
            .or_else(|_| std::env::var("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"))
            .ok()?;

        if url.trim().is_empty() || key.trim().is_empty() {
            return None;
        }

        Some(Self::new(&url, &key))
    }

    /// Upsert tournament row to Supabase 'tournaments' table on conflict 'slug'.
    pub async fn upsert_tournament(&self, row: &Value) -> Result<Value, String> {
        let endpoint = format!("{}/rest/v1/tournaments?on_conflict=slug", self.url);
        let resp = self
            .client
            .post(&endpoint)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=merge-duplicates,return=representation")
            .json(row)
            .send()
            .await
            .map_err(|e| format!("Network request failed: {e}"))?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Supabase HTTP error {status}: {body}"));
        }

        let json_val = resp
            .json::<Value>()
            .await
            .map_err(|e| format!("Failed to parse response JSON: {e}"))?;
        Ok(json_val)
    }

    /// Upsert players list in batches to Supabase 'players' table on conflict 'name'.
    pub async fn upsert_players(
        &self,
        players: &[Value],
        batch_size: Option<usize>,
    ) -> Result<usize, String> {
        if players.is_empty() {
            return Ok(0);
        }

        let mut unique_map = indexmap::IndexMap::new();
        for p in players {
            let formatted = format_player_row(p, None);
            let name = formatted["name"].as_str().unwrap_or("").to_string();
            if !name.is_empty() {
                unique_map.insert(name, formatted);
            }
        }

        let rows: Vec<Value> = unique_map.into_values().collect();
        let chunk_size = batch_size.unwrap_or(100).max(1);
        let mut total_inserted = 0;
        let endpoint = format!("{}/rest/v1/players?on_conflict=name", self.url);

        for chunk in rows.chunks(chunk_size) {
            let resp = self
                .client
                .post(&endpoint)
                .header("apikey", &self.api_key)
                .header("Authorization", format!("Bearer {}", self.api_key))
                .header("Content-Type", "application/json")
                .header("Prefer", "resolution=merge-duplicates")
                .json(&chunk)
                .send()
                .await
                .map_err(|e| format!("Network request failed: {e}"))?;

            let status = resp.status();
            if !status.is_success() {
                let body = resp.text().await.unwrap_or_default();
                return Err(format!("Supabase HTTP error {status} for players: {body}"));
            }

            total_inserted += chunk.len();
        }

        Ok(total_inserted)
    }

    /// Backfill/sync all tournaments and players from `www` folder in `repo_path`.
    pub async fn sync_all(&self, repo_path: &Path) -> Result<(usize, usize), String> {
        let www_path = repo_path.join("www");
        let tour_json_path = www_path.join("tournament.json");

        let mut tour_count = 0;
        if tour_json_path.exists() {
            let content = std::fs::read_to_string(&tour_json_path)
                .map_err(|e| format!("Failed to read {}: {e}", tour_json_path.display()))?;
            let list: Vec<Value> = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse tournament.json: {e}"))?;

            for item in list {
                let rel_path = match item.get("path").and_then(|v| v.as_str()) {
                    Some(p) => p,
                    None => continue,
                };
                let folder_name = rel_path.trim_end_matches("/data.json");
                let data_json_path = www_path.join(folder_name).join("data.json");

                let full_data: Option<Value> = if data_json_path.exists() {
                    std::fs::read_to_string(&data_json_path)
                        .ok()
                        .and_then(|s| serde_json::from_str(&s).ok())
                } else {
                    None
                };

                let row = format_tournament_row(folder_name, &item, full_data.as_ref());
                self.upsert_tournament(&row).await?;
                tour_count += 1;
            }
        }

        let players_json_path = www_path.join("players.json");
        let mut player_count = 0;
        if players_json_path.exists() {
            let content = std::fs::read_to_string(&players_json_path)
                .map_err(|e| format!("Failed to read {}: {e}", players_json_path.display()))?;
            let parsed: Value = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse players.json: {e}"))?;

            let players_vec: Vec<Value> = if let Some(arr) = parsed.as_array() {
                arr.clone()
            } else if let Some(arr) = parsed.get("players").and_then(|v| v.as_array()) {
                arr.clone()
            } else {
                vec![]
            };

            player_count = self.upsert_players(&players_vec, Some(100)).await?;
        }

        Ok((tour_count, player_count))
    }
}
