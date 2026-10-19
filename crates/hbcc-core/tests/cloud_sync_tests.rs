use hbcc_core::github::{CommitResult, GitHubClient};
use hbcc_core::supabase::{format_player_row, format_tournament_row, SupabaseClient};
use serde_json::json;
use std::fs;
use tempfile::tempdir;
use wiremock::matchers::{header, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[test]
fn test_format_tournament_row() {
    let metadata = json!({
        "Tournament Name": "Test Open 2025",
        "Date Begin": "15/01/2025",
        "Date End": "20/01/2025",
        "Rounds": "5",
        "Site": "Hobsons Bay Chess Club",
        "Arbiter(s)": "IA John Doe",
        "Registered Players": "42"
    });

    let top_players = json!([
        { "name": "Alice", "points": 4.5, "rank": 1 },
        { "name": "Bob", "points": 4.0, "rank": 2 }
    ]);

    let result = json!({
        "metadata": metadata,
        "category": "senior",
        "top_players": top_players,
        "data": { "some": "field" }
    });

    let row = format_tournament_row("www2025TestOpen", &result, None);

    assert_eq!(row["slug"], "www2025TestOpen");
    assert_eq!(row["name"], "Test Open 2025");
    assert_eq!(row["path"], "www2025TestOpen/data.json");
    assert_eq!(row["category"], "Senior");
    assert_eq!(row["site"], "Hobsons Bay Chess Club");
    assert_eq!(row["date_begin"], "15/01/2025");
    assert_eq!(row["date_end"], "20/01/2025");
    assert_eq!(row["year"], "2025");
    assert_eq!(row["date_ts"], 20250115);
    assert_eq!(row["rounds"], "5");
    assert_eq!(row["arbiter"], "IA John Doe");
    assert_eq!(row["status"], "completed");
    assert_eq!(row["player_count"], 42);
    assert_eq!(row["top_players"].as_array().unwrap().len(), 2);
}

#[test]
fn test_format_player_row() {
    let raw_player = json!({
        "name": " Charlie Smith ",
        "id": "12345",
        "fideId": "999888",
        "gender": "M",
        "href": "player.html",
        "category": "Junior",
        "tournamentCount": 3,
        "points": {
            "standard": 5.5,
            "rapid": 2.0,
            "blitz": 0.0
        },
        "tournaments": ["t1", "t2", "t3"]
    });

    let row = format_player_row(&raw_player, None);

    assert_eq!(row["name"], "Charlie Smith");
    assert_eq!(row["player_id"], "12345");
    assert_eq!(row["fide_id"], "999888");
    assert_eq!(row["gender"], "M");
    assert_eq!(row["href"], "player.html");
    assert_eq!(row["category"], "Junior");
    assert_eq!(row["tournament_count"], 3);
    assert_eq!(row["points"]["standard"], 5.5);
    assert_eq!(row["tournaments"].as_array().unwrap().len(), 3);
}

#[tokio::test]
async fn test_supabase_upsert_tournament() {
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/rest/v1/tournaments"))
        .and(header("apikey", "test-key"))
        .and(header("Authorization", "Bearer test-key"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!([{
            "id": 1,
            "slug": "www2025TestOpen",
            "name": "Test Open 2025"
        }])))
        .mount(&mock_server)
        .await;

    let client = SupabaseClient::new(&mock_server.uri(), "test-key");
    let row = json!({
        "slug": "www2025TestOpen",
        "name": "Test Open 2025"
    });

    let res = client.upsert_tournament(&row).await;
    assert!(res.is_ok(), "Upsert tournament should succeed: {:?}", res);
    let val = res.unwrap();
    assert_eq!(val[0]["slug"], "www2025TestOpen");
}

#[tokio::test]
async fn test_supabase_upsert_players() {
    let mock_server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path("/rest/v1/players"))
        .and(header("apikey", "test-key"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!([
            { "name": "Player 1" },
            { "name": "Player 2" }
        ])))
        .mount(&mock_server)
        .await;

    let client = SupabaseClient::new(&mock_server.uri(), "test-key");
    let players = vec![
        json!({ "name": "Player 1", "id": "1" }),
        json!({ "name": "Player 2", "id": "2" }),
        json!({ "name": "Player 1", "id": "1" }), // duplicate, will be deduplicated
    ];

    let res = client.upsert_players(&players, Some(10)).await;
    assert!(res.is_ok(), "Upsert players should succeed: {:?}", res);
    assert_eq!(res.unwrap(), 2);
}

#[tokio::test]
async fn test_github_commit_tournament() {
    let mock_server = MockServer::start().await;
    let repo = "Hobsons-Bay-Chess-Club-AU/tournaments";
    let branch = "main";

    // 1. Mock GET ref
    Mock::given(method("GET"))
        .and(path(format!("/repos/{}/git/ref/heads/{}", repo, branch)))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "object": {
                "sha": "1111111111111111111111111111111111111111"
            }
        })))
        .mount(&mock_server)
        .await;

    // 2. Mock GET commit
    Mock::given(method("GET"))
        .and(path(format!(
            "/repos/{}/git/commits/1111111111111111111111111111111111111111",
            repo
        )))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "tree": {
                "sha": "2222222222222222222222222222222222222222"
            }
        })))
        .mount(&mock_server)
        .await;

    // 3. Mock GET contents www/tournament.json
    Mock::given(method("GET"))
        .and(path(format!("/repos/{}/contents/www/tournament.json", repo)))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "content": "W10=" // base64 for "[]"
        })))
        .mount(&mock_server)
        .await;

    // 4. Mock POST blobs
    Mock::given(method("POST"))
        .and(path(format!("/repos/{}/git/blobs", repo)))
        .respond_with(ResponseTemplate::new(201).set_body_json(json!({
            "sha": "blob_sha_12345"
        })))
        .mount(&mock_server)
        .await;

    // 5. Mock POST trees
    Mock::given(method("POST"))
        .and(path(format!("/repos/{}/git/trees", repo)))
        .respond_with(ResponseTemplate::new(201).set_body_json(json!({
            "sha": "tree_sha_67890"
        })))
        .mount(&mock_server)
        .await;

    // 6. Mock POST commits
    Mock::given(method("POST"))
        .and(path(format!("/repos/{}/git/commits", repo)))
        .respond_with(ResponseTemplate::new(201).set_body_json(json!({
            "sha": "abcdef1234567890abcdef1234567890abcdef12"
        })))
        .mount(&mock_server)
        .await;

    // 7. Mock PATCH refs
    Mock::given(method("PATCH"))
        .and(path(format!("/repos/{}/git/refs/heads/{}", repo, branch)))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "object": {
                "sha": "abcdef1234567890abcdef1234567890abcdef12"
            }
        })))
        .mount(&mock_server)
        .await;

    // Prepare temp tournament directory with dummy files
    let temp_dir = tempdir().unwrap();
    let tour_dir = temp_dir.path().join("www2025TestOpen");
    fs::create_dir_all(&tour_dir).unwrap();
    fs::write(tour_dir.join("data.json"), b"{\"test\": true}").unwrap();
    fs::write(tour_dir.join("index.html"), b"<html>Hello</html>").unwrap();

    let client = GitHubClient::with_base_url("test-token", repo, branch, &mock_server.uri());

    let parse_result = json!({
        "metadata": {
            "Tournament Name": "Test Open 2025",
            "category": "Senior"
        },
        "category": "Senior",
        "top_players": []
    });

    let res = client.commit_tournament(&tour_dir, &parse_result).await;
    assert!(res.is_ok(), "GitHub commit failed: {:?}", res);

    let commit_res: CommitResult = res.unwrap();
    assert!(commit_res.success);
    assert_eq!(
        commit_res.commit_sha,
        "abcdef1234567890abcdef1234567890abcdef12"
    );
    assert_eq!(commit_res.short_sha, "abcdef1");
    assert_eq!(commit_res.tournament, "Test Open 2025");
    assert_eq!(commit_res.folder, "www2025TestOpen");
    // 2 files in directory + 1 updated tournament.json = 3 tree entries
    assert_eq!(commit_res.files_count, 3);
}
