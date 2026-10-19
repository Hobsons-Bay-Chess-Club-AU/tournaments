use crate::parser::page::ParsedPage;
use indexmap::IndexMap;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::LazyLock;

static RE_FIDE_EVENT: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"event=(\d+)").unwrap());

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EnrichedPlayer {
    pub id: String,
    #[serde(rename = "playerName")]
    pub player_name: String,
    pub title: String,
    pub federation: String,
    pub rating: String,
    pub gender: String,
    #[serde(rename = "fideId")]
    pub fide_id: String,
    pub href: String,
    #[serde(rename = "moreInfo")]
    pub more_info: IndexMap<String, Value>,
}

fn serialize_point<S>(val: &f64, s: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    if val.fract() == 0.0 {
        s.serialize_i64(*val as i64)
    } else {
        s.serialize_f64(*val)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TopPlayer {
    pub name: String,
    #[serde(serialize_with = "serialize_point")]
    pub point: f64,
    pub elo: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UniquePlayer {
    pub name: String,
    pub id: String,
    #[serde(rename = "fideId")]
    pub fide_id: String,
    pub gender: String,
    pub href: String,
}

fn val_to_str(val: Option<&Value>) -> String {
    match val {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Number(n)) => n.to_string(),
        _ => String::new(),
    }
}

pub fn build_player_lookup(
    pages: &IndexMap<String, ParsedPage>,
    _folder_name: &str,
) -> IndexMap<String, EnrichedPlayer> {
    let mut player_map = IndexMap::new();

    // Step 1: index.html
    if let Some(index_page) = pages.get("index.html") {
        if !index_page.tables.is_empty() {
            let table = &index_page.tables[0];
            for row in &table.rows {
                let player_number = val_to_str(row.get("#"));
                let title = val_to_str(row.get("Title"));
                let federation = val_to_str(row.get("Fed"));
                let rating = val_to_str(row.get("Rtg"));

                let mut player_name = String::new();
                let mut player_id = player_number.clone();
                let mut gender = String::new();
                let mut href = format!("playercard.html#{}", player_number);

                if let Some(player_obj) = row.get("Player") {
                    if let Some(s) = player_obj.as_str() {
                        player_name = s.to_string();
                    } else if let Some(obj) = player_obj.as_object() {
                        if let Some(name) = obj.get("playerName").and_then(|v| v.as_str()) {
                            player_name = name.to_string();
                        }
                        if let Some(id) = obj.get("id").and_then(|v| v.as_str()) {
                            if !id.is_empty() {
                                player_id = id.to_string();
                            }
                        }
                        if let Some(g) = obj.get("gender").and_then(|v| v.as_str()) {
                            gender = g.to_string();
                        }
                        if let Some(h) = obj.get("href").and_then(|v| v.as_str()) {
                            if !h.is_empty() {
                                href = h.to_string();
                            }
                        }
                    }
                }

                if !player_number.is_empty() && !player_name.is_empty() {
                    let player = EnrichedPlayer {
                        id: player_id,
                        player_name,
                        title,
                        federation,
                        rating,
                        gender,
                        fide_id: String::new(),
                        href,
                        more_info: IndexMap::new(),
                    };
                    player_map.insert(player_number, player);
                }
            }
        }
    }

    // Step 2: felovar.html
    if let Some(felovar_page) = pages.get("felovar.html") {
        if !felovar_page.tables.is_empty() {
            let table = &felovar_page.tables[0];
            for row in &table.rows {
                let player_number = val_to_str(row.get("#"));
                let fide_id = val_to_str(row.get("FIDE ID"));
                let fide_rating = val_to_str(row.get("Rtg"));
                let federation = val_to_str(row.get("Fed"));

                let mut player_gender = String::new();
                let mut player_title = String::new();
                let mut player_name = String::new();

                if let Some(p_obj) = row.get("Player").and_then(|v| v.as_object()) {
                    if let Some(g) = p_obj.get("gender").and_then(|v| v.as_str()) {
                        player_gender = g.to_string();
                    }
                    if let Some(t) = p_obj.get("title").and_then(|v| v.as_str()) {
                        player_title = t.to_string();
                    }
                    if let Some(n) = p_obj.get("playerName").and_then(|v| v.as_str()) {
                        player_name = n.to_string();
                    }
                }

                if !player_number.is_empty() && !fide_id.is_empty() {
                    if let Some(existing) = player_map.get_mut(&player_number) {
                        existing.fide_id = fide_id.clone();
                        if !player_gender.is_empty() {
                            existing.gender = player_gender;
                        }
                        if !player_title.is_empty() {
                            existing.title = player_title;
                        }
                        if !federation.is_empty() {
                            existing.federation = federation.clone();
                        }
                        if !fide_rating.is_empty() {
                            existing.rating = fide_rating.clone();
                        }
                        existing
                            .more_info
                            .insert("fideId".to_string(), Value::String(fide_id));
                        existing
                            .more_info
                            .insert("fideRating".to_string(), Value::String(fide_rating));
                        existing
                            .more_info
                            .insert("fideFederation".to_string(), Value::String(federation));
                    } else {
                        let mut more_info = IndexMap::new();
                        more_info.insert("fideId".to_string(), Value::String(fide_id.clone()));
                        more_info.insert("fideRating".to_string(), Value::String(fide_rating.clone()));
                        more_info
                            .insert("fideFederation".to_string(), Value::String(federation.clone()));

                        let new_player = EnrichedPlayer {
                            id: player_number.clone(),
                            player_name,
                            title: player_title,
                            federation,
                            rating: fide_rating,
                            gender: player_gender,
                            fide_id,
                            href: format!("playercard.html#{}", player_number),
                            more_info,
                        };
                        player_map.insert(player_number, new_player);
                    }
                }
            }
        }
    }

    // Step 3: Pairing tables
    for (file_name, page) in pages {
        if file_name != "index.html" && file_name != "felovar.html" {
            for table in &page.tables {
                for row in &table.rows {
                    for (_col, val) in row {
                        if let Some(obj) = val.as_object() {
                            let name = obj.get("playerName").and_then(|v| v.as_str());
                            let id = obj.get("id").and_then(|v| v.as_str());

                            if let (Some(player_name), Some(player_id)) = (name, id) {
                                if !player_id.is_empty() && !player_name.is_empty() {
                                    let gender = obj
                                        .get("gender")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let title = obj
                                        .get("title")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let href = obj
                                        .get("href")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string();

                                    if let Some(existing) = player_map.get_mut(player_id) {
                                        if !gender.is_empty() {
                                            existing.gender = gender;
                                        }
                                        if !title.is_empty() {
                                            existing.title = title;
                                        }
                                        if !href.is_empty() {
                                            existing.href = href;
                                        }
                                        if let Some(m_info) =
                                            obj.get("moreInfo").and_then(|v| v.as_object())
                                        {
                                            for (k, v) in m_info {
                                                existing.more_info.insert(k.clone(), v.clone());
                                            }
                                        }
                                    } else {
                                        let mut more_info = IndexMap::new();
                                        if let Some(m_info) =
                                            obj.get("moreInfo").and_then(|v| v.as_object())
                                        {
                                            for (k, v) in m_info {
                                                more_info.insert(k.clone(), v.clone());
                                            }
                                        }

                                        let new_player = EnrichedPlayer {
                                            id: player_id.to_string(),
                                            player_name: player_name.to_string(),
                                            title,
                                            federation: String::new(),
                                            rating: String::new(),
                                            gender,
                                            fide_id: String::new(),
                                            href: if href.is_empty() {
                                                format!("playercard.html#{}", player_id)
                                            } else {
                                                href
                                            },
                                            more_info,
                                        };
                                        player_map.insert(player_id.to_string(), new_player);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    player_map
}

pub fn enrich_tables_with_player_data(
    pages: &mut IndexMap<String, ParsedPage>,
    player_lookup: &IndexMap<String, EnrichedPlayer>,
) {
    for page in pages.values_mut() {
        for table in &mut page.tables {
            for row in &mut table.rows {
                for val in row.values_mut() {
                    if let Some(obj) = val.as_object() {
                        let has_player = obj.contains_key("playerName") && obj.contains_key("id");
                        if has_player {
                            let player_id = obj
                                .get("id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();

                            if let Some(full) = player_lookup.get(&player_id) {
                                // Recreate enriched object keeping original key order:
                                // { id, playerName, gender, href, title, federation, rating, fideId, moreInfo }
                                let mut enriched = IndexMap::new();
                                enriched.insert("id".to_string(), Value::String(full.id.clone()));
                                enriched.insert(
                                    "playerName".to_string(),
                                    Value::String(full.player_name.clone()),
                                );
                                enriched.insert(
                                    "gender".to_string(),
                                    Value::String(full.gender.clone()),
                                );
                                enriched.insert(
                                    "href".to_string(),
                                    Value::String(full.href.clone()),
                                );
                                enriched.insert(
                                    "title".to_string(),
                                    Value::String(full.title.clone()),
                                );
                                enriched.insert(
                                    "federation".to_string(),
                                    Value::String(full.federation.clone()),
                                );
                                enriched.insert(
                                    "rating".to_string(),
                                    Value::String(full.rating.clone()),
                                );
                                enriched.insert(
                                    "fideId".to_string(),
                                    Value::String(full.fide_id.clone()),
                                );
                                enriched.insert(
                                    "moreInfo".to_string(),
                                    serde_json::to_value(&full.more_info).unwrap(),
                                );

                                *val = Value::Object(
                                    enriched.into_iter().collect::<serde_json::Map<_, _>>(),
                                );
                            }
                        }
                    }
                }
            }
        }
    }
}

pub fn extract_top_players(pages: &IndexMap<String, ParsedPage>) -> Vec<TopPlayer> {
    let standings_page = match pages.get("standings.html") {
        Some(p) => p,
        None => return Vec::new(),
    };

    let standings_table = standings_page.tables.iter().find(|t| {
        let headers: Vec<&str> = t.headers.iter().map(|h| h.name.as_str()).collect();
        headers.contains(&"Player") && headers.contains(&"Pts")
    });

    let table = match standings_table {
        Some(t) => t,
        None => return Vec::new(),
    };

    struct Candidate {
        name: String,
        point: f64,
        elo: String,
        title: String,
        position: i64,
    }

    let mut candidates = Vec::new();

    for row in &table.rows {
        let player_val = row.get("Player");
        let pts_str = val_to_str(row.get("Pts"));
        let pos_str = val_to_str(row.get("Pos"));

        let point: f64 = match pts_str.parse() {
            Ok(p) => p,
            Err(_) => continue,
        };

        let position: i64 = pos_str.parse().unwrap_or(i64::MAX);

        let mut player_name = String::new();
        let mut rating = String::new();
        let mut title = String::new();

        if let Some(obj) = player_val.and_then(|v| v.as_object()) {
            if let Some(n) = obj.get("playerName").and_then(|v| v.as_str()) {
                player_name = n.trim().to_string();
            }
            if let Some(r) = obj.get("rating").and_then(|v| v.as_str()) {
                rating = r.to_string();
            }
            if let Some(t) = obj.get("title").and_then(|v| v.as_str()) {
                title = t.to_string();
            }
        }

        if !player_name.is_empty() {
            candidates.push(Candidate {
                name: player_name,
                point,
                elo: rating,
                title,
                position,
            });
        }
    }

    candidates.sort_by(|a, b| {
        a.position
            .cmp(&b.position)
            .then_with(|| b.point.partial_cmp(&a.point).unwrap_or(std::cmp::Ordering::Equal))
            .then_with(|| a.name.cmp(&b.name))
    });

    candidates
        .into_iter()
        .take(3)
        .map(|c| TopPlayer {
            name: c.name,
            point: c.point,
            elo: c.elo,
            title: c.title,
        })
        .collect()
}

pub fn extract_unique_players(pages: &IndexMap<String, ParsedPage>) -> Vec<UniquePlayer> {
    let mut players = IndexMap::new();

    if let Some(standings_page) = pages.get("standings.html") {
        if !standings_page.tables.is_empty() {
            let table = &standings_page.tables[0];
            for row in &table.rows {
                if let Some(player_obj) = row.get("Player").and_then(|v| v.as_object()) {
                    if let Some(name) = player_obj.get("playerName").and_then(|v| v.as_str()) {
                        let name_trimmed = name.trim().to_string();
                        if !name_trimmed.is_empty() && !players.contains_key(&name_trimmed) {
                            let id = player_obj
                                .get("id")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let gender = player_obj
                                .get("gender")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();
                            let href = player_obj
                                .get("href")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string();

                            let mut fide_id = String::new();
                            if href.contains("ratings.fide.com") {
                                if let Some(caps) = RE_FIDE_EVENT.captures(&href) {
                                    fide_id = caps[1].to_string();
                                }
                            }

                            players.insert(
                                name_trimmed.clone(),
                                UniquePlayer {
                                    name: name_trimmed,
                                    id,
                                    fide_id,
                                    gender,
                                    href,
                                },
                            );
                        }
                    }
                }
            }
        }
    }

    players.into_values().collect()
}
