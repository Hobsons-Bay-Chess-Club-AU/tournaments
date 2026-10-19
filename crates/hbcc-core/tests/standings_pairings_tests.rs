use hbcc_core::parser::page::process_html_content;
use hbcc_core::parser::table::determine_table_type;

#[test]
fn test_parse_standings_and_pairings_from_fixture() {
    let standing_html = include_str!("fixtures/2025BestintheWest/input/standings.html");
    let parsed_standing = process_html_content(standing_html, "standings.html");
    assert!(!parsed_standing.tables.is_empty());
    assert_eq!(
        parsed_standing.page_heading,
        "Standings at round 5 (last round)"
    );

    let table = &parsed_standing.tables[0];
    assert_eq!(determine_table_type(table, "standings.html"), "standings");
    assert!(table.rows.len() > 10);

    let first_row = &table.rows[0];
    assert!(first_row.contains_key("Player"));
    assert!(first_row.contains_key("Pts"));

    let pairs_html = include_str!("fixtures/2025BestintheWest/input/pairs1.html");
    let parsed_pairs = process_html_content(pairs_html, "pairs1.html");
    assert!(!parsed_pairs.tables.is_empty());

    let pair_table = &parsed_pairs.tables[0];
    assert_eq!(determine_table_type(pair_table, "pairs1.html"), "pairing");

    let crosstable_html = include_str!("fixtures/2025BestintheWest/input/crosstable.html");
    let parsed_crosstable = process_html_content(crosstable_html, "crosstable.html");
    assert!(!parsed_crosstable.tables.is_empty());

    let cross_table = &parsed_crosstable.tables[0];
    assert_eq!(
        determine_table_type(cross_table, "crosstable.html"),
        "standings"
    );
    let cross_first_row = &cross_table.rows[0];
    assert!(cross_first_row.contains_key("1"));
    let r1_cell = cross_first_row.get("1").unwrap();
    assert_eq!(r1_cell["result"], "1");
}
