use crate::parser::table::{parse_table_to_json, ParsedTable};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

static SEL_TABLE: LazyLock<Selector> = LazyLock::new(|| Selector::parse("table").unwrap());
static SEL_H3: LazyLock<Selector> = LazyLock::new(|| Selector::parse("h3").unwrap());
static SEL_TOOLBAR_H5: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse(".btn-toolbar h5").unwrap());

static SEL_MATCH_ITEM: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse(".match-item").unwrap());
static SEL_STAT_COLLAPSE: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse(".stat-collapse").unwrap());
static SEL_STAT_CARD: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse(".card.stat-card").unwrap());
static SEL_TEAM_SCRIPT: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("script[src*='pairingteam']").unwrap());
static SEL_STRIPED_TR: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("table.table-striped tbody tr").unwrap());
static SEL_TH: LazyLock<Selector> = LazyLock::new(|| Selector::parse("th").unwrap());

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ParsedPage {
    #[serde(rename = "pageHeading")]
    pub page_heading: String,
    pub tables: Vec<ParsedTable>,
    #[serde(rename = "pairingScheduleText", skip_serializing_if = "Option::is_none")]
    pub pairing_schedule_text: Option<String>,
    #[serde(rename = "tournamentType")]
    pub tournament_type: String,
}

pub fn detect_tournament_type(html: &str) -> String {
    let doc = Html::parse_document(html);

    let has_team_matches = doc.select(&SEL_MATCH_ITEM).next().is_some();
    let has_collapsible = doc.select(&SEL_STAT_COLLAPSE).next().is_some();
    let has_team_cards = doc.select(&SEL_STAT_CARD).next().is_some();
    let has_team_script = doc.select(&SEL_TEAM_SCRIPT).next().is_some();

    if has_team_matches && has_collapsible && has_team_cards && has_team_script {
        return "team".to_string();
    }

    let has_standard_table = doc.select(&SEL_STRIPED_TR).next().is_some();
    let th_text: String = doc.select(&SEL_TH).map(|e| e.text().collect::<String>()).collect();
    let has_player_cols = th_text.contains("White Player") && th_text.contains("Black Player");

    if has_standard_table && has_player_cols {
        return "individual".to_string();
    }

    "unknown".to_string()
}

pub fn process_html_content(html: &str, _file_name: &str) -> ParsedPage {
    let doc = Html::parse_document(html);
    let tournament_type = detect_tournament_type(html);

    let mut tables = Vec::new();
    for table_elem in doc.select(&SEL_TABLE) {
        tables.push(parse_table_to_json(&table_elem));
    }

    let page_heading = doc
        .select(&SEL_H3)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let pairing_schedule_text = doc
        .select(&SEL_TOOLBAR_H5)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .filter(|s| !s.is_empty());

    ParsedPage {
        page_heading,
        tables,
        pairing_schedule_text,
        tournament_type,
    }
}
