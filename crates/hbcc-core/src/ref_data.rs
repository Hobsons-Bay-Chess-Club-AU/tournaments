/// List of known senior players used for tournament categorization heuristics.
pub const SENIOR_PLAYERS: &[&str] = &[
    "Whitford,Matthew",
    "Hogan,Steven",
    "Hogg,Dean",
    "Nowak,Ruben",
];

pub fn is_senior_player(player_name: &str) -> bool {
    SENIOR_PLAYERS.iter().any(|&p| p == player_name)
}
