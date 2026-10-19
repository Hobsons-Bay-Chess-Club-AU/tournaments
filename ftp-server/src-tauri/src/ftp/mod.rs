pub mod auth;

use crate::ftp::auth::KeypairAuthenticator;
use crate::parser::run_tournament_parser;
use libunftp::options::Shutdown;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{oneshot, Mutex};
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
    app_handle: Option<tauri::AppHandle>,
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

    let authenticator = Arc::new(KeypairAuthenticator::from_env_or_default());

    let server = libunftp::ServerBuilder::new(Box::new(move || {
        Filesystem::new(root_for_fs.clone()).unwrap()
    }))
    .authenticator(authenticator)
    .passive_host(libunftp::options::PassiveHost::FromConnection)
    .greeting("HBCC Vega Tournament FTP Server ready")
    .shutdown_indicator(async move {
        let _ = shutdown_rx.await;
        Shutdown::new().grace_period(Duration::from_millis(500))
    })
    .build()
    .map_err(|e| format!("Failed to build FTP server: {:?}", e))?;

    let app_handle_ftp = app_handle.clone();
    tokio::spawn(async move {
        if let Err(e) = server.listen(addr.to_string()).await {
            eprintln!("FTP server listener error: {:?}", e);
            crate::commands::emit_log(
                app_handle_ftp.as_ref(),
                "ERROR",
                "FTP",
                &format!("FTP listener error: {:?}", e),
            );
        }
    });

    let on_file_cb = Arc::new(on_file_uploaded);
    let debounce_map: Arc<Mutex<HashMap<PathBuf, tokio::task::JoinHandle<()>>>> =
        Arc::new(Mutex::new(HashMap::new()));

    let on_file_cb_watcher = on_file_cb.clone();
    let root_for_watcher_clone = root_for_watcher.clone();
    let debounce_map_clone = debounce_map.clone();
    let app_watcher = app_handle.clone();

    let rt_handle = tokio::runtime::Handle::current();
    let rt_for_watcher = rt_handle.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        for path in event.paths {
                            if path.is_file() {
                                let filename = path
                                    .file_name()
                                    .unwrap_or_default()
                                    .to_string_lossy()
                                    .to_string();
                                let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                                let rel = path
                                    .strip_prefix(&root_for_watcher_clone)
                                    .unwrap_or(&path)
                                    .to_string_lossy()
                                    .to_string();

                                on_file_cb_watcher(rel.clone(), size);
                                crate::commands::emit_log(
                                    app_watcher.as_ref(),
                                    "INFO",
                                    "FTP",
                                    &format!("Received file '{}' ({} bytes)", rel, size),
                                );

                                // If uploaded file is an HTML or tournament file, schedule debounced parse
                                if filename != "data.json"
                                    && filename != "data_clean.json"
                                    && (filename.ends_with(".html") || filename.ends_with(".php"))
                                {
                                    let tour_dir =
                                        path.parent().unwrap_or(&root_for_watcher_clone).to_path_buf();
                                    let dmap = debounce_map_clone.clone();
                                    let cb = on_file_cb_watcher.clone();
                                    let root_base = root_for_watcher_clone.clone();
                                    let tdir = tour_dir.clone();
                                    let rt_inner = rt_for_watcher.clone();
                                    let app_parse = app_watcher.clone();
                                    let tname = tdir
                                        .file_name()
                                        .unwrap_or_default()
                                        .to_string_lossy()
                                        .to_string();

                                    crate::commands::emit_log(
                                        app_watcher.as_ref(),
                                        "INFO",
                                        "Watcher",
                                        &format!(
                                            "Tournament change detected in '{}' ({}). Parsing in 1.5s...",
                                            tname, filename
                                        ),
                                    );

                                    rt_for_watcher.spawn(async move {
                                        let mut map = dmap.lock().await;
                                        if let Some(existing) = map.remove(&tdir) {
                                            existing.abort();
                                        }

                                        let target_dir = tdir.clone();
                                        let map_key = tdir.clone();

                                        let task = rt_inner.spawn(async move {
                                            tokio::time::sleep(Duration::from_millis(1500)).await;
                                            match run_tournament_parser(target_dir.clone(), app_parse.clone()).await {
                                                Ok(res) => {
                                                    for gen_file in res.files_generated {
                                                        let gen_path = target_dir.join(&gen_file);
                                                        let sz = std::fs::metadata(&gen_path)
                                                            .map(|m| m.len())
                                                            .unwrap_or(0);
                                                        let gen_rel = gen_path
                                                            .strip_prefix(&root_base)
                                                            .unwrap_or(&gen_path)
                                                            .to_string_lossy()
                                                            .to_string();
                                                        cb(gen_rel.clone(), sz);
                                                    }
                                                }
                                                Err(err) => {
                                                    crate::commands::emit_log(
                                                        app_parse.as_ref(),
                                                        "ERROR",
                                                        "Parser",
                                                        &format!("Parser failed: {}", err),
                                                    );
                                                }
                                            }
                                        });

                                        map.insert(map_key, task);
                                    });
                                }
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
