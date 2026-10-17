use std::fs;
use tokio::time::{sleep, Duration};

#[tokio::test]
async fn test_http_server_serves_html_and_index() {
    let temp_dir = tempfile::tempdir().unwrap();
    let root_path = temp_dir.path().to_path_buf();
    let sample_file = root_path.join("index.html");
    fs::write(&sample_file, "<html><body><h1>Vega Tournament</h1></body></html>").unwrap();

    let port = 18080;
    let handle = hbcc_ftp_server_lib::http::start_http_server("127.0.0.1", port, root_path.clone())
        .await
        .expect("Failed to start HTTP server");

    sleep(Duration::from_millis(200)).await;

    let resp = reqwest::get(format!("http://127.0.0.1:{}/index.html", port))
        .await
        .expect("HTTP GET failed");

    assert_eq!(resp.status(), 200);
    let body = resp.text().await.unwrap();
    assert!(body.contains("Vega Tournament"));

    handle.stop().await;
}
