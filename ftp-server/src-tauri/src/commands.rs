use crate::ftp::{start_ftp_server, FtpServerHandle};
use crate::http::{start_http_server, HttpServerHandle};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub ftp_handle: Arc<Mutex<Option<FtpServerHandle>>>,
    pub http_handle: Arc<Mutex<Option<HttpServerHandle>>>,
    pub current_status: Arc<Mutex<ServiceStatus>>,
}

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct ServiceStatus {
    pub is_running: bool,
    pub ftp_port: u16,
    pub http_port: u16,
    pub storage_dir: String,
}

#[derive(Clone, Serialize)]
pub struct FileReceivedPayload {
    pub filename: String,
    pub relative_path: String,
    pub size_bytes: u64,
    pub timestamp: String,
}

#[tauri::command]
pub async fn start_services(
    app: AppHandle,
    state: State<'_, AppState>,
    ftp_port: u16,
    http_port: u16,
    storage_dir: String,
) -> Result<ServiceStatus, String> {
    let mut ftp_guard = state.ftp_handle.lock().await;
    let mut http_guard = state.http_handle.lock().await;

    if ftp_guard.is_some() || http_guard.is_some() {
        return Err("Services are already running".into());
    }

    let root_path = PathBuf::from(&storage_dir);
    let app_handle_clone = app.clone();

    let ftp = start_ftp_server(
        "127.0.0.1",
        ftp_port,
        root_path.clone(),
        move |filename, size| {
            let now = format_iso_timestamp();
            let _ = app_handle_clone.emit(
                "ftp-file-received",
                FileReceivedPayload {
                    filename: filename.clone(),
                    relative_path: filename,
                    size_bytes: size,
                    timestamp: now,
                },
            );
        },
    )
    .await?;

    let http = start_http_server("127.0.0.1", http_port, root_path).await?;

    *ftp_guard = Some(ftp);
    *http_guard = Some(http);

    let status = ServiceStatus {
        is_running: true,
        ftp_port,
        http_port,
        storage_dir,
    };
    *state.current_status.lock().await = status.clone();

    Ok(status)
}

#[tauri::command]
pub async fn stop_services(state: State<'_, AppState>) -> Result<(), String> {
    let mut ftp_guard = state.ftp_handle.lock().await;
    let mut http_guard = state.http_handle.lock().await;

    if let Some(ftp) = ftp_guard.take() {
        ftp.stop().await;
    }
    if let Some(http) = http_guard.take() {
        http.stop().await;
    }

    let mut status = state.current_status.lock().await;
    status.is_running = false;

    Ok(())
}

#[tauri::command]
pub async fn get_services_status(state: State<'_, AppState>) -> Result<ServiceStatus, String> {
    Ok(state.current_status.lock().await.clone())
}

#[tauri::command]
pub fn get_default_storage_dir() -> Result<String, String> {
    let doc_dir = dirs::document_dir().unwrap_or_else(|| PathBuf::from("."));
    let target = doc_dir.join("HBCC_Tournaments");
    if !target.exists() {
        let _ = std::fs::create_dir_all(&target);
    }
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        let _ = std::fs::create_dir_all(&p);
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

#[derive(Clone, Serialize)]
pub struct AuthInfo {
    pub user_count: usize,
    pub usernames: Vec<String>,
}

#[tauri::command]
pub fn get_auth_info() -> Result<AuthInfo, String> {
    let auth = crate::ftp::auth::KeypairAuthenticator::from_env_or_default();
    Ok(AuthInfo {
        user_count: auth.user_count(),
        usernames: auth.usernames(),
    })
}

#[tauri::command]
pub fn restart_app(app: tauri::AppHandle) {
    app.restart();
}


fn format_iso_timestamp() -> String {
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let millis = duration.subsec_millis();
    format!("{}.{:03}", secs, millis)
}
