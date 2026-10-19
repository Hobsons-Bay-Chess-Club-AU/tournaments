use indexmap::IndexMap;
use scraper::{Html, Selector};
use std::sync::LazyLock;

static SEL_TOURSTAT_TR: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("table.table-striped tbody tr").unwrap()
});

static SEL_TD: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("td").unwrap()
});

static SEL_INDEX_DIV: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("div.flex.flex-column.justify-content-center.text-center.text-white").unwrap()
});

static SEL_H1: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("h1").unwrap()
});

static SEL_H5: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("h5").unwrap()
});

static SEL_TITLE: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("title").unwrap()
});

/// Collapse multiple whitespace characters into a single space and trim.
pub fn clean_whitespace(s: &str) -> String {
    let words: Vec<&str> = s.split_whitespace().collect();
    words.join(" ")
}

/// Extract metadata key-value pairs from tourstat.html content.
pub fn extract_metadata(html: &str) -> Result<IndexMap<String, String>, String> {
    let document = Html::parse_document(html);
    let mut metadata = IndexMap::new();

    for tr in document.select(&SEL_TOURSTAT_TR) {
        let tds: Vec<_> = tr.select(&SEL_TD).collect();
        if tds.len() == 2 {
            let key = clean_whitespace(&tds[0].text().collect::<String>());
            let value = clean_whitespace(&tds[1].text().collect::<String>());
            metadata.insert(key, value);
        }
    }

    Ok(metadata)
}

/// Extract fallback metadata from index.html (Tournament Name, Federation, Date).
pub fn extract_minimal_metadata_from_index(html: &str) -> IndexMap<String, String> {
    let document = Html::parse_document(html);
    let mut meta = IndexMap::new();

    if let Some(div) = document.select(&SEL_INDEX_DIV).next() {
        if let Some(h1) = div.select(&SEL_H1).next() {
            meta.insert(
                "Tournament Name".to_string(),
                clean_whitespace(&h1.text().collect::<String>()),
            );
        }
        let h5s: Vec<_> = div.select(&SEL_H5).collect();
        if !h5s.is_empty() {
            meta.insert(
                "Federation".to_string(),
                clean_whitespace(&h5s[0].text().collect::<String>()),
            );
        }
        if h5s.len() >= 2 {
            meta.insert(
                "Date".to_string(),
                clean_whitespace(&h5s[1].text().collect::<String>()),
            );
        }
    } else {
        // Fallback: try to get h1 and h5 anywhere in document
        if let Some(h1) = document.select(&SEL_H1).next() {
            let name = clean_whitespace(&h1.text().collect::<String>());
            if !name.is_empty() {
                meta.insert("Tournament Name".to_string(), name);
            }
        }
        let h5s: Vec<_> = document.select(&SEL_H5).collect();
        if !h5s.is_empty() {
            meta.insert(
                "Federation".to_string(),
                clean_whitespace(&h5s[0].text().collect::<String>()),
            );
        }
        if h5s.len() >= 2 {
            meta.insert(
                "Date".to_string(),
                clean_whitespace(&h5s[1].text().collect::<String>()),
            );
        }
    }

    if !meta.contains_key("Tournament Name") {
        if let Some(title) = document.select(&SEL_TITLE).next() {
            let title_text = clean_whitespace(&title.text().collect::<String>());
            if !title_text.is_empty() {
                meta.insert("Tournament Name".to_string(), title_text);
            }
        }
    }

    meta
}
