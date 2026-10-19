use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

static SEL_NAV_LI: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("ul.navbar-nav.me-auto.mb-2.mb-lg-0 > li").unwrap()
});
static SEL_NAV_LINK: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("a.nav-link, a.nav-link.dropdown-toggle").unwrap()
});
static SEL_DROPDOWN_ITEM: LazyLock<Selector> = LazyLock::new(|| {
    Selector::parse("ul.dropdown-menu > li > a").unwrap()
});

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DropdownChild {
    pub text: String,
    pub href: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MenuItem {
    pub text: String,
    pub href: Option<String>,
    #[serde(rename = "isDropdown")]
    pub is_dropdown: bool,
    pub children: Vec<DropdownChild>,
}

/// Extract navbar menu structure from index.html content.
pub fn extract_menu_structure(html: &str) -> Vec<MenuItem> {
    let doc = Html::parse_document(html);
    let mut menu = Vec::new();

    for li in doc.select(&SEL_NAV_LI) {
        let link_opt = li.select(&SEL_NAV_LINK).next();
        let text = link_opt
            .map(|l| l.text().collect::<String>().trim().to_string())
            .unwrap_or_default();
        let href = link_opt
            .and_then(|l| l.value().attr("href"))
            .map(|h| h.trim().to_string())
            .filter(|h| !h.is_empty());

        let li_class = li.value().attr("class").unwrap_or("");
        let is_dropdown = li_class.split_whitespace().any(|c| c == "dropdown")
            || link_opt
                .and_then(|l| l.value().attr("class"))
                .map(|c| c.split_whitespace().any(|w| w == "dropdown-toggle"))
                .unwrap_or(false);

        let mut children = Vec::new();
        if is_dropdown {
            for a in li.select(&SEL_DROPDOWN_ITEM) {
                let child_text = a.text().collect::<String>().trim().to_string();
                let child_href = a
                    .value()
                    .attr("href")
                    .map(|h| h.trim().to_string())
                    .filter(|h| !h.is_empty());
                children.push(DropdownChild {
                    text: child_text,
                    href: child_href,
                });
            }
        }

        menu.push(MenuItem {
            text,
            href,
            is_dropdown,
            children,
        });
    }

    menu
}
