use axum::{
    body::Body,
    extract::Request,
    http::{header, Response, StatusCode},
    Router,
};
use std::fs;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use tokio::sync::oneshot;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

pub struct HttpServerHandle {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl HttpServerHandle {
    pub async fn stop(mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

pub async fn start_http_server(
    host: &str,
    port: u16,
    root_dir: PathBuf,
) -> Result<HttpServerHandle, String> {
    let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .map_err(|e| format!("Invalid HTTP address {}:{}: {}", host, port, e))?;

    std::fs::create_dir_all(&root_dir)
        .map_err(|e| format!("Failed to create storage directory for HTTP: {}", e))?;

    let root_clone = root_dir.clone();
    let serve_dir = ServeDir::new(root_dir.clone())
        .append_index_html_on_directories(true)
        .fallback(axum::routing::get(move |req: Request| {
            let root = root_clone.clone();
            async move { handle_fallback(req, root).await }
        }));

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let app = Router::new()
        .fallback_service(serve_dir)
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Failed to bind HTTP server to {}: {}", addr, e))?;

    tokio::spawn(async move {
        let _ = axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                let _ = shutdown_rx.await;
            })
            .await;
    });

    Ok(HttpServerHandle {
        shutdown_tx: Some(shutdown_tx),
    })
}

async fn handle_fallback(req: Request, root: PathBuf) -> Response<Body> {
    let path = req.uri().path();
    let safe_subpath = path.trim_start_matches('/');
    let target = root.join(safe_subpath);

    if target.is_dir() {
        return generate_dir_listing(&target, path);
    }

    Response::builder()
        .status(StatusCode::NOT_FOUND)
        .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
        .body(Body::from(format!(
            "<!DOCTYPE html><html><head><title>404 Not Found</title><style>body {{ font-family: -apple-system, sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc; text-align: center; }}</style></head><body><h1>404 - Not Found</h1><p>The requested tournament file <code>{}</code> was not found.</p><p><a href='/' style='color: #38bdf8;'>Return to Tournament Directory</a></p></body></html>",
            path
        )))
        .unwrap()
}

fn generate_dir_listing(dir: &Path, uri_path: &str) -> Response<Body> {
    let mut entries = Vec::new();
    if let Ok(read_dir) = fs::read_dir(dir) {
        for entry in read_dir.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.path().is_dir();
            entries.push((name, is_dir));
        }
    }
    entries.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

    let mut list_html = String::new();
    if uri_path != "/" && !uri_path.is_empty() {
        list_html.push_str("<li>📁 <a href='..'>.. (Parent Directory)</a></li>");
    }

    if entries.is_empty() {
        list_html.push_str("<li class='empty'>No files uploaded yet. Publish from Vega to see files here.</li>");
    } else {
        for (name, is_dir) in entries {
            let icon = if is_dir { "📁" } else { "📄" };
            let slash = if is_dir { "/" } else { "" };
            let href = if uri_path.ends_with('/') {
                format!("{}{}{}", uri_path, name, slash)
            } else {
                format!("{}/{}{}", uri_path, name, slash)
            };
            list_html.push_str(&format!(
                "<li>{} <a href='{}'>{}{}</a></li>",
                icon, href, name, slash
            ));
        }
    }

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HBCC Tournament Server: {uri_path}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; margin: 0; }}
    .container {{ max-width: 800px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 1px solid #334155; }}
    h1 {{ font-size: 1.5rem; margin-top: 0; color: #38bdf8; display: flex; align-items: center; gap: 0.5rem; }}
    .path {{ font-family: monospace; background: #0f172a; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 1rem; color: #cbd5e1; }}
    ul {{ list-style: none; padding: 0; margin: 1.5rem 0; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }}
    li {{ padding: 0.75rem 1rem; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 0.75rem; }}
    li:last-child {{ border-bottom: none; }}
    li:hover {{ background: #334155; }}
    li.empty {{ color: #94a3b8; font-style: italic; }}
    a {{ color: #38bdf8; text-decoration: none; font-weight: 500; }}
    a:hover {{ text-decoration: underline; }}
    .badge {{ font-size: 0.75rem; background: #0284c7; color: white; padding: 0.15rem 0.5rem; border-radius: 9999px; }}
  </style>
</head>
<body>
  <div class="container">
    <h1>🏆 HBCC Vega Local Tournament Server <span class="badge">Preview</span></h1>
    <p>Index of: <span class="path">{uri_path}</span></p>
    <ul>
      {list_html}
    </ul>
  </div>
</body>
</html>"#
    );

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
        .body(Body::from(html))
        .unwrap()
}
