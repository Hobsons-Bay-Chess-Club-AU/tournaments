#[cfg(test)]
mod tests {
    use std::fs;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::time::{sleep, Duration};

    async fn http_get(port: u16, path: &str) -> (u16, String) {
        let mut stream = tokio::net::TcpStream::connect(format!("127.0.0.1:{}", port))
            .await
            .expect("Failed to connect to HTTP preview server");
        let req = format!(
            "GET {} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n",
            path
        );
        stream.write_all(req.as_bytes()).await.unwrap();
        let mut buf = Vec::new();
        stream.read_to_end(&mut buf).await.unwrap();
        let response = String::from_utf8_lossy(&buf).to_string();
        let status = if response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200") {
            200
        } else {
            500
        };
        (status, response)
    }

    #[test]
    fn test_skeleton() {
        assert_eq!(2 + 2, 4);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_end_to_end_vega_ftp_and_http_preview() {
        let temp_dir = tempfile::tempdir().unwrap();
        let root_path = temp_dir.path().to_path_buf();
        let ftp_port = 23121;
        let http_port = 19080;

        let upload_count = Arc::new(AtomicUsize::new(0));
        let upload_clone = upload_count.clone();

        // 1. Start FTP Server
        let ftp_handle = crate::ftp::start_ftp_server(
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
        let http_handle = crate::http::start_http_server(
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
                "--connect-timeout",
                "5",
                "--max-time",
                "10",
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
        let (status, body) = http_get(http_port, "/standings.html").await;
        assert_eq!(status, 200);
        assert!(body.contains("Round 1 Standings"));

        // 6. Verify directory index listing
        let (root_status, index_body) = http_get(http_port, "/").await;
        assert_eq!(root_status, 200);
        assert!(index_body.contains("standings.html"));

        // 7. Clean shutdown
        ftp_handle.stop().await;
        http_handle.stop().await;
    }

    #[tokio::test]
    async fn test_ftp_server_lifecycle_and_permissive_auth() {
        let temp_dir = tempfile::tempdir().unwrap();
        let root_path = temp_dir.path().to_path_buf();
        let port = 22121; // test port
        let upload_count = Arc::new(AtomicUsize::new(0));
        let upload_counter_clone = upload_count.clone();

        let server_handle = crate::ftp::start_ftp_server(
            "127.0.0.1",
            port,
            root_path.clone(),
            None,
            move |_filename, _bytes| {
                upload_counter_clone.fetch_add(1, Ordering::SeqCst);
            },
        )
        .await
        .expect("FTP server failed to start");

        // Sleep briefly to ensure listener is active
        sleep(Duration::from_millis(300)).await;

        // Test TCP connect
        let stream = tokio::net::TcpStream::connect(format!("127.0.0.1:{}", port)).await;
        assert!(stream.is_ok(), "Failed to connect to FTP port");

        // Test rejection of unauthorized credentials
        let test_file = root_path.join("unauth.txt");
        std::fs::write(&test_file, "malicious").unwrap();

        let output = tokio::process::Command::new("curl")
            .args([
                "-T",
                test_file.to_str().unwrap(),
                &format!("ftp://127.0.0.1:{}/unauth.txt", port),
                "--user",
                "unauthorized_user:wrong_password",
                "--connect-timeout",
                "5",
                "--max-time",
                "10",
            ])
            .output()
            .await
            .expect("Failed to execute curl");

        // Rejection: status is non-zero (CURLE_LOGIN_DENIED)
        assert!(
            !output.status.success(),
            "Unauthorized user should be rejected by FTP authenticator"
        );

        server_handle.stop().await;
    }

    #[tokio::test]
    async fn test_http_server_serves_html_and_index() {
        let temp_dir = tempfile::tempdir().unwrap();
        let root_path = temp_dir.path().to_path_buf();
        let sample_file = root_path.join("index.html");
        fs::write(&sample_file, "<html><body><h1>Vega Tournament</h1></body></html>").unwrap();

        let port = 18080;
        let handle = crate::http::start_http_server("127.0.0.1", port, root_path.clone())
            .await
            .expect("Failed to start HTTP server");

        sleep(Duration::from_millis(200)).await;

        let (status, body) = http_get(port, "/index.html").await;
        assert_eq!(status, 200);
        assert!(body.contains("Vega Tournament"));

        handle.stop().await;
    }
}
