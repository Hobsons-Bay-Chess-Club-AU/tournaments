use std::fs;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_end_to_end_vega_ftp_and_http_preview() {
    let temp_dir = tempfile::tempdir().unwrap();
    let root_path = temp_dir.path().to_path_buf();
    let ftp_port = 23121;
    let http_port = 19080;

    let upload_count = Arc::new(AtomicUsize::new(0));
    let upload_clone = upload_count.clone();

    // 1. Start FTP Server
    let ftp_handle = hbcc_ftp_server_lib::ftp::start_ftp_server(
        "127.0.0.1",
        ftp_port,
        root_path.clone(),
        None,
        move |_filename, _size| {
            upload_clone.fetch_add(1, Ordering::SeqCst);
        },
    )
    .await
    .expect("Failed to start FTP server");

    // 2. Start HTTP Preview Server
    let http_handle = hbcc_ftp_server_lib::http::start_http_server(
        "127.0.0.1",
        http_port,
        root_path.clone(),
    )
    .await
    .expect("Failed to start HTTP server");

    sleep(Duration::from_millis(300)).await;

    // 3. Simulate Vega publishing files via FTP using tokio async Command
    let sample_html = r#"<!DOCTYPE html><html><head><title>HBCC Summer Cup</title></head><body><h1>Round 1 Standings</h1><p>1. GM Carlsen (1.0)</p></body></html>"#;
    let temp_upload_file = temp_dir.path().join("local_standings.html");
    fs::write(&temp_upload_file, sample_html).unwrap();

    let output = tokio::process::Command::new("curl")
        .args([
            "-T",
            temp_upload_file.to_str().unwrap(),
            &format!("ftp://127.0.0.1:{}/standings.html", ftp_port),
            "--user",
            "vega:vega",
        ])
        .output()
        .await
        .expect("Failed to execute curl FTP upload");

    assert!(
        output.status.success(),
        "curl FTP upload failed: {:?}",
        String::from_utf8_lossy(&output.stderr)
    );

    // Wait briefly for file write and watcher event
    sleep(Duration::from_millis(500)).await;

    // 4. Verify file was saved on disk
    let destination_file = root_path.join("standings.html");
    assert!(destination_file.exists(), "Uploaded file does not exist on disk");
    let content = fs::read_to_string(&destination_file).unwrap();
    assert!(content.contains("Round 1 Standings"));

    // 5. Verify HTTP preview server serves the uploaded file
    let resp = reqwest::get(format!("http://127.0.0.1:{}/standings.html", http_port))
        .await
        .expect("HTTP GET failed");
    assert_eq!(resp.status(), 200);
    let body = resp.text().await.unwrap();
    assert!(body.contains("Round 1 Standings"));

    // 6. Verify directory index listing
    let root_resp = reqwest::get(format!("http://127.0.0.1:{}/", http_port))
        .await
        .expect("HTTP root index failed");
    assert_eq!(root_resp.status(), 200);
    let index_body = root_resp.text().await.unwrap();
    assert!(index_body.contains("standings.html"));

    // 7. Clean shutdown
    ftp_handle.stop().await;
    http_handle.stop().await;
}
