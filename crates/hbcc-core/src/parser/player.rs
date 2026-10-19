use indexmap::IndexMap;
use regex::Regex;
use scraper::{ElementRef, Html, Selector};
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

static RE_ID: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)ID\s*=\s*(\d+)").unwrap());
static RE_N: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)N\s*=\s*(\d+)").unwrap());
static RE_K: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)K\s*=\s*([^,]+)").unwrap());
static RE_ELO: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)Elo\s*=\s*([^,]+)").unwrap());
static RE_FIDE_EVENT: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"event=(\d+)").unwrap());

static SEL_STRONG: LazyLock<Selector> = LazyLock::new(|| Selector::parse("strong").unwrap());
static SEL_FIDE_LINK: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("a[href*='ratings.fide.com']").unwrap());
static SEL_ANCHOR: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("a.anchor").unwrap());
static SEL_ANY_ELEM: LazyLock<Selector> = LazyLock::new(|| Selector::parse("*").unwrap());

static SEL_ID_PAIR: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("span.idwhite, span.idblack").unwrap());
static SEL_SORT_NUM: LazyLock<Selector> = LazyLock::new(|| Selector::parse(".sort-num").unwrap());
static SEL_TITLE_SPAN: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("span.title").unwrap());
static SEL_GENDER_SPAN: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("span.male, span.female, span.notitle").unwrap());
static SEL_GENDER_DIV: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse(".male, .female, .notitle2").unwrap());
static SEL_A: LazyLock<Selector> = LazyLock::new(|| Selector::parse("a").unwrap());
static SEL_BOX2_SPAN: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse(".player-name-box2 span").unwrap());

static SEL_IDN: LazyLock<Selector> = LazyLock::new(|| Selector::parse("span.idn").unwrap());
static SEL_BADGE: LazyLock<Selector> = LazyLock::new(|| Selector::parse("span.badge").unwrap());
static SEL_ALL_GENDER: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("span.male, span.female, span.notitle, .male, .female, .notitle2").unwrap()
});

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CaptionPlayerInfo {
    #[serde(rename = "playerName")]
    pub player_name: String,
    pub id: String,
    #[serde(rename = "moreInfo")]
    pub more_info: IndexMap<String, String>,
    #[serde(rename = "rawText")]
    pub raw_text: String,
    #[serde(rename = "rawHtml")]
    pub raw_html: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct ParsedPlayerRef {
    pub id: String,
    #[serde(rename = "playerName")]
    pub player_name: String,
    pub gender: String,
    pub href: String,
    pub title: String,
}

/// Helper to check if an element has a specific class
fn has_class(elem: &ElementRef, class_name: &str) -> bool {
    elem.value()
        .attr("class")
        .map(|c| c.split_whitespace().any(|w| w == class_name))
        .unwrap_or(false)
}

/// Parse a caption ElementRef directly to player info.
pub fn parse_caption_element(caption_elem: &ElementRef) -> CaptionPlayerInfo {
    let caption_text = caption_elem.text().collect::<String>();
    let caption_inner_html = caption_elem.inner_html();

    let mut player_name = String::new();
    let mut more_info = IndexMap::new();

    // Pattern 1: Strong tag
    if let Some(strong) = caption_elem.select(&SEL_STRONG).next() {
        player_name = strong.text().collect::<String>().trim().to_string();
    }

    // Pattern 2: FIDE rating link
    if player_name.is_empty() {
        if let Some(fide_link) = caption_elem.select(&SEL_FIDE_LINK).next() {
            player_name = fide_link.text().collect::<String>().trim().to_string();
            if let Some(href) = fide_link.value().attr("href") {
                if let Some(caps) = RE_FIDE_EVENT.captures(href) {
                    more_info.insert("FIDE_ID".to_string(), caps[1].to_string());
                }
            }
        }
    }

    // Extract ID
    let player_id = RE_ID
        .captures(&caption_text)
        .map(|c| c[1].to_string())
        .unwrap_or_default();

    // Extract N value
    if let Some(caps) = RE_N.captures(&caption_text) {
        more_info.insert("N".to_string(), caps[1].trim().to_string());
    }

    // Extract K value
    if let Some(caps) = RE_K.captures(&caption_text) {
        more_info.insert("K".to_string(), caps[1].trim().to_string());
    }

    // Extract Elo value
    if let Some(caps) = RE_ELO.captures(&caption_text) {
        more_info.insert("Elo".to_string(), caps[1].trim().to_string());
    }

    // Extract anchor name
    if let Some(anchor) = caption_elem.select(&SEL_ANCHOR).next() {
        if let Some(name) = anchor.value().attr("name") {
            more_info.insert("anchor".to_string(), name.to_string());
        }
    }

    CaptionPlayerInfo {
        player_name,
        id: player_id,
        more_info,
        raw_text: caption_text.trim().to_string(),
        raw_html: caption_inner_html,
    }
}

/// Parse caption to player info or fallback text.
pub fn parse_caption_player_info(caption_html: &str) -> Option<CaptionPlayerInfo> {
    let wrapped_html = if !caption_html.to_lowercase().contains("<table") {
        format!("<table>{}</table>", caption_html)
    } else {
        caption_html.to_string()
    };

    let fragment = Html::parse_fragment(&wrapped_html);
    let caption_elem = fragment
        .select(&Selector::parse("caption").unwrap())
        .next()
        .unwrap_or_else(|| fragment.root_element());

    let has_html = caption_elem.select(&SEL_ANY_ELEM).next().is_some();
    if !has_html {
        return None;
    }

    Some(parse_caption_element(&caption_elem))
}

/// Parse White Player and Black Player cells in pairing tables.
pub fn read_pair_player(td: &ElementRef) -> ParsedPlayerRef {
    let mut id = String::new();
    let mut title = String::new();
    let mut gender = String::new();
    let mut player_name = String::new();
    let mut href = String::new();

    // Look for ID
    if let Some(id_span) = td.select(&SEL_ID_PAIR).next() {
        id = id_span.text().collect::<String>().trim().to_string();
    } else if let Some(sort_num) = td.select(&SEL_SORT_NUM).next() {
        id = sort_num.text().collect::<String>().trim().to_string();
    }

    // Look for title
    if let Some(title_span) = td.select(&SEL_TITLE_SPAN).next() {
        title = title_span.text().collect::<String>().trim().to_string();
    }

    // Look for gender
    if let Some(gender_span) = td.select(&SEL_GENDER_SPAN).next() {
        if has_class(&gender_span, "male") {
            gender = "male".to_string();
        } else if has_class(&gender_span, "female") {
            gender = "female".to_string();
        } else if has_class(&gender_span, "notitle") {
            gender = "notitle".to_string();
        }
    } else if let Some(gender_div) = td.select(&SEL_GENDER_DIV).next() {
        if has_class(&gender_div, "male") {
            gender = "male".to_string();
        } else if has_class(&gender_div, "female") {
            gender = "female".to_string();
        } else if has_class(&gender_div, "notitle2") {
            gender = "notitle".to_string();
        }
    }
    if gender.is_empty() {
        gender = "notitle".to_string();
    }

    // Look for player name and href
    if let Some(anchor) = td.select(&SEL_A).next() {
        href = anchor.value().attr("href").unwrap_or("").to_string();
        player_name = anchor.text().collect::<String>().trim().to_string();

        if player_name.is_empty() {
            if let Some(box2) = td.select(&SEL_BOX2_SPAN).next() {
                player_name = box2.text().collect::<String>().trim().to_string();
            }
        }
    }

    ParsedPlayerRef {
        id,
        player_name,
        gender,
        href,
        title,
    }
}

/// Parse Player column in standings tables.
pub fn read_player(td: &ElementRef) -> ParsedPlayerRef {
    let mut id = String::new();
    let mut title = String::new();
    let mut gender = String::new();
    let mut player_name = String::new();
    let mut href = String::new();

    // Pattern 1: span.idn
    if let Some(id_span) = td.select(&SEL_IDN).next() {
        id = id_span.text().collect::<String>().trim().to_string();
    } else if let Some(sort_num) = td.select(&SEL_SORT_NUM).next() {
        id = sort_num.text().collect::<String>().trim().to_string();
    } else if let Some(badge) = td.select(&SEL_BADGE).next() {
        let text = badge.text().collect::<String>();
        let words: Vec<&str> = text.split_whitespace().collect();
        id = words.join(" ");
    }

    // Title
    if let Some(title_span) = td.select(&SEL_TITLE_SPAN).next() {
        title = title_span.text().collect::<String>().trim().to_string();
    }

    // Gender
    if let Some(gender_elem) = td.select(&SEL_ALL_GENDER).next() {
        let is_male = has_class(&gender_elem, "male");
        let is_female = has_class(&gender_elem, "female");
        let is_notitle = has_class(&gender_elem, "notitle") || has_class(&gender_elem, "notitle2");

        if is_male {
            gender = "male".to_string();
        } else if is_female {
            gender = "female".to_string();
        } else if is_notitle {
            gender = "notitle".to_string();
        }
    }
    if gender.is_empty() {
        gender = "notitle".to_string();
    }

    // Player name from anchor
    if let Some(anchor) = td.select(&SEL_A).next() {
        player_name = anchor.text().collect::<String>().trim().to_string();
        href = anchor.value().attr("href").unwrap_or("").to_string();
    }

    // Fallback 1: box2 span
    if player_name.is_empty() {
        if let Some(box2) = td.select(&SEL_BOX2_SPAN).next() {
            player_name = box2.text().collect::<String>().trim().to_string();
        }
    }

    // Fallback 2: unrated players text content
    if player_name.is_empty() {
        let all_text = td.text().collect::<String>().trim().to_string();
        let gender_text = td
            .select(&SEL_ALL_GENDER)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        if !gender_text.is_empty() && all_text != gender_text {
            player_name = all_text.replace(&gender_text, "").trim().to_string();
        } else if !all_text.is_empty() {
            player_name = all_text;
        }
    }

    ParsedPlayerRef {
        id,
        player_name,
        gender,
        href,
        title,
    }
}
