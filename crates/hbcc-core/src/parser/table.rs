use crate::parser::player::{parse_caption_player_info, read_pair_player, read_player};
use indexmap::IndexMap;
use regex::Regex;
use scraper::{ElementRef, Selector};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::LazyLock;

static RE_DIGITS: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\d+$").unwrap());
static RE_FED_CODE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^[A-Za-z]{2,3}$").unwrap());

static SEL_CAPTION: LazyLock<Selector> = LazyLock::new(|| Selector::parse("caption").unwrap());
static SEL_TFOOT_TD: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("tfoot tr td").unwrap());
static SEL_THEAD_CELL: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("thead tr th, thead tr td").unwrap());
static SEL_TBODY_TR: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("tbody tr").unwrap());
static SEL_TD: LazyLock<Selector> = LazyLock::new(|| Selector::parse("td").unwrap());
static SEL_SPAN_OR_A: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("span, a").unwrap());
static SEL_RES_DIV: LazyLock<Selector> = LazyLock::new(|| Selector::parse("div.res").unwrap());
static SEL_CW_DIV: LazyLock<Selector> = LazyLock::new(|| Selector::parse("div.cw").unwrap());
static SEL_CB_DIV: LazyLock<Selector> = LazyLock::new(|| Selector::parse("div.cb").unwrap());
static SEL_IMG: LazyLock<Selector> = LazyLock::new(|| Selector::parse("img").unwrap());
static SEL_ANY: LazyLock<Selector> = LazyLock::new(|| Selector::parse("*").unwrap());

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TableHeader {
    pub name: String,
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TableFooter {
    pub text: String,
    pub html: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct ParsedTable {
    pub headers: Vec<TableHeader>,
    pub rows: Vec<IndexMap<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub caption: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub footer: Option<TableFooter>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub table_type: Option<String>,
}

pub fn determine_table_type(table: &ParsedTable, file_name: &str) -> String {
    if table.table_type.as_deref() == Some("team-pairs") {
        return "team-pairs".to_string();
    }

    let headers: Vec<String> = table
        .headers
        .iter()
        .map(|h| h.name.to_lowercase())
        .collect();

    let has_white = headers
        .iter()
        .any(|key| key.contains("white") || key == "white" || key == "w");
    let has_black = headers
        .iter()
        .any(|key| key.contains("black") || key == "black" || key == "b");

    if has_white && has_black {
        return "pairing".to_string();
    }

    if headers.contains(&"player".to_string()) && headers.contains(&"pts".to_string()) {
        return "standings".to_string();
    }

    if file_name.contains("crosstable") || headers.iter().any(|k| RE_DIGITS.is_match(k)) {
        return "crosstable".to_string();
    }

    if headers.contains(&"statistics".to_string()) || file_name.contains("stat") {
        return "statistics".to_string();
    }

    "other".to_string()
}

pub fn parse_table_to_json(table: &ElementRef) -> ParsedTable {
    let mut caption: Option<Value> = None;

    if let Some(caption_elem) = table.select(&SEL_CAPTION).next() {
        let has_child = caption_elem.select(&SEL_ANY).next().is_some();
        if !has_child {
            let text = caption_elem.text().collect::<String>().trim().to_string();
            caption = Some(Value::String(text));
        } else {
            let html_str = caption_elem.html();
            if let Some(info) = parse_caption_player_info(&html_str) {
                caption = Some(serde_json::to_value(info).unwrap());
            }
        }
    } else {
        // Look for preceding h5 element
        let mut prev = table.prev_sibling();
        while let Some(node) = prev {
            if let Some(el) = ElementRef::wrap(node) {
                if el.value().name() == "h5" {
                    let h5_text = el.text().collect::<String>().trim().to_string();
                    if !h5_text.is_empty() {
                        caption = Some(json!({
                            "playerName": h5_text,
                            "id": "",
                            "moreInfo": json!({}),
                            "rawText": h5_text,
                            "rawHtml": el.inner_html().trim().to_string()
                        }));
                    }
                    break;
                }
            }
            prev = node.prev_sibling();
        }
    }

    // Parse footer
    let mut footer: Option<TableFooter> = None;
    if let Some(foot_cell) = table.select(&SEL_TFOOT_TD).next() {
        footer = Some(TableFooter {
            text: foot_cell.text().collect::<String>().trim().to_string(),
            html: foot_cell.inner_html().trim().to_string(),
        });
    }

    // Build headers with unique keys
    let mut headers = Vec::new();
    let mut header_name_count: HashMap<String, usize> = HashMap::new();

    for (i, cell) in table.select(&SEL_THEAD_CELL).enumerate() {
        let raw = cell.text().collect::<String>().trim().replace("↕ ", "");
        let base_name = if raw.is_empty() {
            format!("col{}", i + 1)
        } else {
            raw
        };
        let count = header_name_count.get(&base_name).copied().unwrap_or(0);
        let key = if count == 0 {
            base_name.clone()
        } else {
            format!("{}_{}", base_name, count)
        };
        header_name_count.insert(base_name.clone(), count + 1);
        headers.push(TableHeader {
            name: base_name,
            key,
        });
    }

    let mut rows = Vec::new();
    let header_names: Vec<String> = headers.iter().map(|h| h.name.clone()).collect();
    let has_player_column = header_names.contains(&"Player".to_string())
        || header_names.contains(&"NAME".to_string());

    for tr in table.select(&SEL_TBODY_TR) {
        let mut row_obj: IndexMap<String, Value> = IndexMap::new();

        for (j, td) in tr.select(&SEL_TD).enumerate() {
            let (header_name, header_key) = if j < headers.len() {
                (headers[j].name.clone(), headers[j].key.clone())
            } else {
                (format!("col{}", j + 1), format!("col{}", j + 1))
            };

            if header_name == "White Player"
                || header_name == "Black Player"
                || header_name == "Player"
            {
                let has_children = td.select(&SEL_SPAN_OR_A).next().is_some();
                if has_children {
                    if header_name == "Player" {
                        let p = read_player(&td);
                        row_obj.insert(header_key, serde_json::to_value(p).unwrap());
                    } else {
                        let p = read_pair_player(&td);
                        row_obj.insert(header_key, serde_json::to_value(p).unwrap());
                    }
                } else {
                    let text = td.text().collect::<String>().trim().to_string();
                    row_obj.insert(header_key, Value::String(text));
                }
            } else {
                // Check for crosstable cell
                if let Some(res_div) = td.select(&SEL_RES_DIV).next() {
                    let result_str = res_div.text().collect::<String>().trim().to_string();
                    let white_opp = td
                        .select(&SEL_CW_DIV)
                        .next()
                        .map(|el| el.text().collect::<String>().trim().to_string());
                    let black_opp = td
                        .select(&SEL_CB_DIV)
                        .next()
                        .map(|el| el.text().collect::<String>().trim().to_string());

                    row_obj.insert(
                        header_key,
                        json!({
                            "result": result_str,
                            "whiteOpponent": white_opp,
                            "blackOpponent": black_opp
                        }),
                    );
                } else if td
                    .value()
                    .attr("class")
                    .map(|c| c.split_whitespace().any(|w| w == "hole"))
                    .unwrap_or(false)
                {
                    row_obj.insert(header_key, Value::String("×".to_string()));
                } else if let Some(img) = td.select(&SEL_IMG).next() {
                    let alt = img.value().attr("alt");
                    let src = img.value().attr("src");

                    let mut fed_code = String::new();
                    if let Some(a) = alt {
                        if !a.trim().is_empty() {
                            fed_code = a.trim().to_uppercase();
                        }
                    }
                    if fed_code.is_empty() {
                        if let Some(s) = src {
                            let trimmed = s.trim();
                            if !trimmed.is_empty() {
                                if trimmed.contains('/') {
                                    let parts: Vec<&str> = trimmed.split('/').collect();
                                    if parts.len() > 1 {
                                        let file_name = parts[parts.len() - 1];
                                        fed_code = file_name
                                            .split('.')
                                            .next()
                                            .unwrap_or("")
                                            .to_uppercase();
                                    } else {
                                        fed_code = trimmed.to_uppercase();
                                    }
                                } else {
                                    fed_code = trimmed.to_uppercase();
                                }
                            }
                        }
                    }
                    row_obj.insert(header_key, Value::String(fed_code.to_uppercase()));
                } else {
                    let cell_text = td.text().collect::<String>().trim().to_string();
                    if RE_FED_CODE.is_match(&cell_text) {
                        row_obj.insert(header_key, Value::String(cell_text.to_uppercase()));
                    } else {
                        row_obj.insert(header_key, Value::String(cell_text));
                    }
                }
            }
        }

        // Post-process row
        if has_player_column {
            let mut col_keys: Vec<String> = row_obj
                .keys()
                .filter(|k| k.starts_with("col"))
                .cloned()
                .collect();
            if !col_keys.is_empty() {
                col_keys.sort();
                let pts_val = row_obj.get("Pts").and_then(|v| v.as_str());
                let missing_pts = pts_val.map(|s| s.is_empty()).unwrap_or(true);

                if missing_pts {
                    let first_col = col_keys[0].clone();
                    if let Some(val) = row_obj.shift_remove(&first_col) {
                        row_obj.insert("Pts".to_string(), val);
                    }
                }
            }
        }

        rows.push(row_obj);
    }

    ParsedTable {
        headers,
        rows,
        caption,
        footer,
        table_type: None,
    }
}
