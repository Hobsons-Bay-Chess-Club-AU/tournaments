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
    pub local_ip: Option<String>,
}

pub fn get_local_ip() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    Some(socket.local_addr().ok()?.ip().to_string())
}

#[derive(Clone, Serialize, Deserialize)]
pub struct SystemLogPayload {
    pub id: String,
    pub timestamp: String,
    pub level: String, // "INFO", "WARN", "ERROR"
    pub source: String, // "FTP", "HTTP", "Parser", "Supabase", "System"
    pub message: String,
}

pub fn emit_log(app: Option<&AppHandle>, level: &str, source: &str, message: &str) {
    let now = format_iso_timestamp();
    let id = format!("{}_{}", now, rand_suffix());
    println!("[{}] [{}] {}", source, level, message);
    if let Some(app) = app {
        let _ = app.emit(
            "system-log",
            SystemLogPayload {
                id,
                timestamp: now,
                level: level.to_string(),
                source: source.to_string(),
                message: message.to_string(),
            },
        );
    }
}

fn rand_suffix() -> u32 {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    nanos % 10000
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

    emit_log(
        Some(&app),
        "INFO",
        "System",
        &format!("Starting tournament services (FTP: {}, HTTP: {})...", ftp_port, http_port),
    );
    emit_log(
        Some(&app),
        "INFO",
        "System",
        &format!("Storage directory configured: {}", storage_dir),
    );

    let root_path = PathBuf::from(&storage_dir);
    let app_handle_clone = app.clone();
    let app_for_ftp = app.clone();

    let lan_ip = get_local_ip();
    let lan_ip_str = lan_ip.as_deref().unwrap_or("127.0.0.1");

    let ftp = start_ftp_server(
        "0.0.0.0",
        ftp_port,
        root_path.clone(),
        Some(app_for_ftp),
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

    let http = start_http_server("0.0.0.0", http_port, root_path).await?;

    *ftp_guard = Some(ftp);
    *http_guard = Some(http);

    emit_log(
        Some(&app),
        "INFO",
        "FTP",
        &format!(
            "FTP Server active on 0.0.0.0:{} (Local: 127.0.0.1:{}, LAN: {}:{})",
            ftp_port, ftp_port, lan_ip_str, ftp_port
        ),
    );
    emit_log(
        Some(&app),
        "INFO",
        "HTTP",
        &format!(
            "HTTP Preview server active on 0.0.0.0:{} (Local: http://127.0.0.1:{}, LAN: http://{}:{})",
            http_port, http_port, lan_ip_str, http_port
        ),
    );

    let status = ServiceStatus {
        is_running: true,
        ftp_port,
        http_port,
        storage_dir,
        local_ip: lan_ip,
    };
    *state.current_status.lock().await = status.clone();

    Ok(status)
}

#[tauri::command]
pub async fn stop_services(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    emit_log(Some(&app), "INFO", "System", "Stopping FTP and HTTP services...");
    let mut ftp_guard = state.ftp_handle.lock().await;
    let mut http_guard = state.http_handle.lock().await;

    if let Some(ftp) = ftp_guard.take() {
        ftp.stop().await;
        emit_log(Some(&app), "INFO", "FTP", "FTP server listener stopped.");
    }
    if let Some(http) = http_guard.take() {
        http.stop().await;
        emit_log(Some(&app), "INFO", "HTTP", "HTTP preview server stopped.");
    }

    let mut status = state.current_status.lock().await;
    status.is_running = false;
    emit_log(Some(&app), "INFO", "System", "All services offline.");

    Ok(())
}

#[tauri::command]
pub async fn get_services_status(state: State<'_, AppState>) -> Result<ServiceStatus, String> {
    let mut status = state.current_status.lock().await.clone();
    status.local_ip = get_local_ip();
    Ok(status)
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
