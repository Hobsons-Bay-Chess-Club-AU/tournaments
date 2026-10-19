use hbcc_core::parser::player::{
    parse_caption_player_info, read_pair_player, read_player,
};
use hbcc_core::parser::tourstat::extract_metadata;
use scraper::{Html, Selector};

#[test]
fn test_tourstat_metadata_extraction() {
    let html = r#"
    <table class="table-striped">
      <tbody>
        <tr><td>Tournament Name</td><td>2026 HBCC Club Championship</td></tr>
        <tr><td>Site</td><td>Hobsons Bay Chess Club</td></tr>
        <tr><td>Rounds</td><td>7</td></tr>
        <tr><td>Date Begin</td><td>05/02/2026</td></tr>
        <tr><td>Date End</td><td>19/03/2026</td></tr>
        <tr><td>Arbiter(s)</td><td>IA Truong Nguyen</td></tr>
      </tbody>
    </table>"#;

    let meta = extract_metadata(html).unwrap();
    assert_eq!(
        meta.get("Tournament Name").unwrap(),
        "2026 HBCC Club Championship"
    );
    assert_eq!(meta.get("Site").unwrap(), "Hobsons Bay Chess Club");
    assert_eq!(meta.get("Rounds").unwrap(), "7");
}

#[test]
fn test_parse_player_fide_link_caption() {
    let caption = r#"<caption><a href="http://ratings.fide.com/card.phtml?event=3244806" target="X"> Annapureddy, Rheyansh Reddy </a> ID=3244806, N=1, Elo=1850</caption>"#;
    let info = parse_caption_player_info(caption).unwrap();
    assert_eq!(info.player_name, "Annapureddy, Rheyansh Reddy");
    assert_eq!(info.id, "3244806");
    assert_eq!(info.more_info.get("FIDE_ID").unwrap(), "3244806");
    assert_eq!(info.more_info.get("N").unwrap(), "1");
    assert_eq!(info.more_info.get("Elo").unwrap(), "1850");
}

#[test]
fn test_read_pair_player() {
    let html = r#"<table><tr><td><span class="idwhite">1</span> <span class="title">FM</span> <span class="male"></span> <a href="playercard.html#1">Nguyen, Truong</a></td></tr></table>"#;
    let doc = Html::parse_fragment(html);
    let td = doc.select(&Selector::parse("td").unwrap()).next().unwrap();
    let player = read_pair_player(&td);
    assert_eq!(player.id, "1");
    assert_eq!(player.title, "FM");
    assert_eq!(player.gender, "male");
    assert_eq!(player.player_name, "Nguyen, Truong");
    assert_eq!(player.href, "playercard.html#1");
}

#[test]
fn test_read_player_unrated_text() {
    let html = r#"<table><tr><td><span class="notitle male"></span> Balaji,Sai Sivesh</td></tr></table>"#;
    let doc = Html::parse_fragment(html);
    let td = doc.select(&Selector::parse("td").unwrap()).next().unwrap();
    let player = read_player(&td);
    assert_eq!(player.gender, "male");
    assert_eq!(player.player_name, "Balaji,Sai Sivesh");
}
