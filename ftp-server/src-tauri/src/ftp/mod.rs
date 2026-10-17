pub mod auth;

use libunftp::auth::AnonymousAuthenticator;
use libunftp::options::Shutdown;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::oneshot;
use unftp_sbe_fs::Filesystem;

pub struct FtpServerHandle {
    shutdown_tx: Option<oneshot::Sender<()>>,
    _watcher: Option<RecommendedWatcher>,
}

impl FtpServerHandle {
    pub async fn stop(mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

pub async fn start_ftp_server<F>(
    host: &str,
    port: u16,
    root_dir: PathBuf,
    on_file_uploaded: F,
) -> Result<FtpServerHandle, String>
where
    F: Fn(String, u64) + Send + Sync + 'static,
{
    std::fs::create_dir_all(&root_dir)
        .map_err(|e| format!("Failed to create storage directory: {}", e))?;

    let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .map_err(|e| format!("Invalid address {}:{}: {}", host, port, e))?;

    let root_for_fs = root_dir.clone();
    let root_for_watcher = root_dir.clone();
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let server = libunftp::ServerBuilder::new(Box::new(move || {
        Filesystem::new(root_for_fs.clone()).unwrap()
    }))
    .authenticator(Arc::new(AnonymousAuthenticator))
    .greeting("HBCC Vega Tournament FTP Server ready")
    .shutdown_indicator(async move {
        let _ = shutdown_rx.await;
        Shutdown::new().grace_period(Duration::from_millis(500))
    })
    .build()
    .map_err(|e| format!("Failed to build FTP server: {:?}", e))?;

    tokio::spawn(async move {
        if let Err(e) = server.listen(addr.to_string()).await {
            eprintln!("FTP server listener error: {:?}", e);
        }
    });

    let on_file_cb = Arc::new(on_file_uploaded);
    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        for path in event.paths {
                            if path.is_file() {
                                let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                                let rel = path
                                    .strip_prefix(&root_for_watcher)
                                    .unwrap_or(&path)
                                    .to_string_lossy()
                                    .to_string();
                                on_file_cb(rel, size);
                            }
                        }
                    }
                    _ => {}
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create file watcher: {}", e))?;

    watcher
        .watch(&root_dir, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch directory: {}", e))?;

    Ok(FtpServerHandle {
        shutdown_tx: Some(shutdown_tx),
        _watcher: Some(watcher),
    })
}
