use crate::parser::lookup::EnrichedPlayer;
use crate::parser::menu::MenuItem;
use crate::parser::page::ParsedPage;
use crate::parser::table::determine_table_type;
use indexmap::IndexMap;
use regex::Regex;
use serde_json::{json, Value};
use std::sync::LazyLock;

static RE_SPACES: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

fn parse_int(s: Option<&String>) -> i64 {
    s.and_then(|v| v.trim().parse::<i64>().ok()).unwrap_or(0)
}

pub fn transform_to_normalized_data(
    page_data: &IndexMap<String, ParsedPage>,
    player_lookup: &IndexMap<String, EnrichedPlayer>,
    metadata: &IndexMap<String, String>,
    menu: &[MenuItem],
    category: &str,
    generated_at: &str,
) -> Value {
    // 1. Players array
    let mut players = Vec::new();
    for player in player_lookup.values() {
        let fide_rating = player
            .more_info
            .get("fideRating")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<i64>().ok());

        let fide_fed = player
            .more_info
            .get("fideFederation")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let origin = player
            .more_info
            .get("origin")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let gender = if player.gender.is_empty() {
            "notitle"
        } else {
            &player.gender
        };

        let href = if player.href.is_empty() {
            format!("playercard.html#{}", player.id)
        } else {
            player.href.clone()
        };

        players.push(json!({
            "id": player.id,
            "name": player.player_name,
            "title": player.title,
            "federation": player.federation,
            "fideId": player.fide_id,
            "fideRating": fide_rating,
            "fideFederation": fide_fed,
            "gender": gender,
            "href": href,
            "origin": origin
        }));
    }

    // 2. Transformed pages
    let mut transformed_pages = IndexMap::new();

    for (file_name, page) in page_data {
        let mut transformed_tables = Vec::new();

        for table in &page.tables {
            if table.table_type.as_deref() == Some("team-pairs") {
                let mut table_obj = serde_json::to_value(table).unwrap();
                table_obj["type"] = Value::String("team-pairs".to_string());
                transformed_tables.push(table_obj);
                continue;
            }

            let table_type = determine_table_type(table, file_name);

            let mut transformed_rows = Vec::new();
            for row in &table.rows {
                let mut transformed_row = IndexMap::new();

                for (key, val) in row {
                    if let Some(obj) = val.as_object() {
                        let name_ok = obj
                            .get("playerName")
                            .and_then(|v| v.as_str())
                            .map(|s| !s.is_empty())
                            .unwrap_or(false);
                        let id_opt = obj.get("id").and_then(|v| v.as_str());
                        let id_ok = id_opt.map(|s| !s.is_empty()).unwrap_or(false);

                        if name_ok && id_ok {
                            transformed_row.insert(key.clone(), Value::String(id_opt.unwrap().to_string()));
                            continue;
                        }
                    }
                    transformed_row.insert(key.clone(), val.clone());
                }

                transformed_rows.push(transformed_row);
            }

            let mut table_map = IndexMap::new();
            table_map.insert("headers".to_string(), serde_json::to_value(&table.headers).unwrap());
            table_map.insert("rows".to_string(), serde_json::to_value(&transformed_rows).unwrap());

            if let Some(ref cap) = table.caption {
                table_map.insert("caption".to_string(), cap.clone());
            }
            if let Some(ref foot) = table.footer {
                table_map.insert("footer".to_string(), serde_json::to_value(foot).unwrap());
            }

            table_map.insert("type".to_string(), Value::String(table_type));

            let table_val = Value::Object(table_map.into_iter().collect::<serde_json::Map<_, _>>());
            transformed_tables.push(table_val);
        }

        let mut page_map_obj = IndexMap::new();
        page_map_obj.insert("pageHeading".to_string(), Value::String(page.page_heading.clone()));
        page_map_obj.insert("tables".to_string(), Value::Array(transformed_tables));

        if let Some(ref schedule) = page.pairing_schedule_text {
            page_map_obj.insert("pairingScheduleText".to_string(), Value::String(schedule.clone()));
        }

        page_map_obj.insert("tournamentType".to_string(), Value::String(page.tournament_type.clone()));

        let page_val = Value::Object(page_map_obj.into_iter().collect::<serde_json::Map<_, _>>());
        transformed_pages.insert(file_name.clone(), page_val);
    }

    // 3. Tournament metadata
    let tour_name = metadata
        .get("Tournament Name")
        .cloned()
        .unwrap_or_else(|| "Unknown Tournament".to_string());

    let tour_id = RE_SPACES
        .replace_all(&tour_name, "-")
        .to_lowercase();

    let mut meta_obj = IndexMap::new();
    for (k, v) in metadata {
        meta_obj.insert(k.clone(), Value::String(v.clone()));
    }

    // Append camelCase metadata fields
    meta_obj.insert("tournamentName".to_string(), Value::String(tour_name.clone()));
    meta_obj.insert(
        "federation".to_string(),
        metadata
            .get("Federation")
            .map(|s| Value::String(s.clone()))
            .unwrap_or(Value::Null),
    );
    meta_obj.insert(
        "dateBegin".to_string(),
        metadata
            .get("Date Begin")
            .map(|s| Value::String(s.clone()))
            .unwrap_or(Value::Null),
    );
    meta_obj.insert(
        "dateEnd".to_string(),
        metadata
            .get("Date End")
            .map(|s| Value::String(s.clone()))
            .unwrap_or(Value::Null),
    );
    meta_obj.insert(
        "arbiters".to_string(),
        metadata
            .get("Arbiter(s)")
            .map(|s| Value::String(s.clone()))
            .unwrap_or(Value::Null),
    );
    meta_obj.insert(
        "playSystem".to_string(),
        metadata
            .get("Play System")
            .map(|s| Value::String(s.clone()))
            .unwrap_or(Value::Null),
    );
    meta_obj.insert(
        "rounds".to_string(),
        json!(parse_int(metadata.get("Rounds"))),
    );
    meta_obj.insert(
        "scoreGame".to_string(),
        metadata
            .get("Score game")
            .map(|s| Value::String(s.clone()))
            .unwrap_or(Value::Null),
    );
    meta_obj.insert(
        "tieBreak".to_string(),
        metadata
            .get("Tie break")
            .map(|s| Value::String(s.clone()))
            .unwrap_or(Value::Null),
    );
    meta_obj.insert(
        "registeredPlayers".to_string(),
        json!(parse_int(metadata.get("Registered Players"))),
    );
    meta_obj.insert(
        "averageRating".to_string(),
        json!(parse_int(metadata.get("Average Rating (all)"))),
    );
    meta_obj.insert(
        "averageRatingFide".to_string(),
        json!(parse_int(metadata.get("Average Rating (only FIDE rated)"))),
    );
    meta_obj.insert(
        "fideRatedPlayers".to_string(),
        json!(parse_int(metadata.get("FIDE rated players"))),
    );
    meta_obj.insert(
        "unratedPlayers".to_string(),
        json!(parse_int(metadata.get("unrated players"))),
    );
    meta_obj.insert(
        "fideTitledPlayers".to_string(),
        json!(parse_int(metadata.get("FIDE titled players"))),
    );

    json!({
        "generatedAt": generated_at,
        "tournament": {
            "id": tour_id,
            "name": tour_name,
            "category": category,
            "metadata": meta_obj
        },
        "players": players,
        "pages": transformed_pages,
        "menu": menu
    })
}
