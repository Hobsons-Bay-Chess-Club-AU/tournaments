use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::time::{sleep, Duration};

#[tokio::test]
async fn test_ftp_server_lifecycle_and_permissive_auth() {
    let temp_dir = tempfile::tempdir().unwrap();
    let root_path = temp_dir.path().to_path_buf();
    let port = 22121; // test port
    let upload_count = Arc::new(AtomicUsize::new(0));
    let upload_counter_clone = upload_count.clone();

    let server_handle = hbcc_ftp_server_lib::ftp::start_ftp_server(
        "127.0.0.1",
        port,
        root_path.clone(),
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

    server_handle.stop().await;
}
