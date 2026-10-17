import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { LazyStore } from "@tauri-apps/plugin-store";

// DOM Elements
const statusPill = document.getElementById("statusPill");
const statusText = document.getElementById("statusText");
const toggleServerBtn = document.getElementById("toggleServerBtn");
const previewSiteBtn = document.getElementById("previewSiteBtn");
const folderPathText = document.getElementById("folderPathText");
const changeFolderBtn = document.getElementById("changeFolderBtn");
const openFolderBtn = document.getElementById("openFolderBtn");
const ftpPortInput = document.getElementById("ftpPortInput");
const httpPortInput = document.getElementById("httpPortInput");
const vHost = document.getElementById("vHost");
const vPort = document.getElementById("vPort");
const copyVegaBtn = document.getElementById("copyVegaBtn");
const uploadBadge = document.getElementById("uploadBadge");
const clearLogsBtn = document.getElementById("clearLogsBtn");
const activityList = document.getElementById("activityList");
const emptyState = document.getElementById("emptyState");
const checkUpdateBtn = document.getElementById("checkUpdateBtn");
const toast = document.getElementById("toast");

// Store & Local State
const store = new LazyStore("settings.json");

let state = {
  isRunning: false,
  storageDir: "",
  ftpPort: 2121,
  httpPort: 8080,
  uploadCount: 0,
};

function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  switch (ext) {
    case "html":
    case "htm":
      return "🌐";
    case "css":
      return "🎨";
    case "js":
      return "⚡";
    case "json":
    case "csv":
      return "📊";
    case "png":
    case "jpg":
    case "gif":
      return "🖼️";
    case "php":
      return "🐘";
    default:
      return "📄";
  }
}

function updateUI() {
  if (state.isRunning) {
    statusPill.className = "status-pill online";
    statusText.textContent = `Online (FTP: ${state.ftpPort} | HTTP: ${state.httpPort})`;
    toggleServerBtn.textContent = "Stop Server";
    toggleServerBtn.className = "btn btn-danger";
    previewSiteBtn.disabled = false;
  } else {
    statusPill.className = "status-pill offline";
    statusText.textContent = "Server Stopped";
    toggleServerBtn.textContent = "Start Server";
    toggleServerBtn.className = "btn btn-primary";
  }

  folderPathText.textContent = state.storageDir || "Not set";
  folderPathText.title = state.storageDir || "";
  ftpPortInput.value = state.ftpPort;
  httpPortInput.value = state.httpPort;
  vPort.textContent = state.ftpPort;
  uploadBadge.textContent = `${state.uploadCount} file${state.uploadCount === 1 ? "" : "s"}`;
}

async function startServer() {
  try {
    const ftpPort = parseInt(ftpPortInput.value, 10) || 2121;
    const httpPort = parseInt(httpPortInput.value, 10) || 8080;

    toggleServerBtn.disabled = true;
    toggleServerBtn.textContent = "Starting...";

    const status = await invoke("start_services", {
      ftpPort,
      httpPort,
      storageDir: state.storageDir,
    });

    state.isRunning = status.is_running;
    state.ftpPort = status.ftp_port;
    state.httpPort = status.http_port;

    await store.set("ftpPort", state.ftpPort);
    await store.set("httpPort", state.httpPort);
    await store.save();

    showToast("Server started successfully!");
  } catch (err) {
    showToast(`Error starting server: ${err}`, 5000);
  } finally {
    toggleServerBtn.disabled = false;
    updateUI();
  }
}

async function stopServer() {
  try {
    toggleServerBtn.disabled = true;
    toggleServerBtn.textContent = "Stopping...";
    await invoke("stop_services");
    state.isRunning = false;
    showToast("Server stopped");
  } catch (err) {
    showToast(`Error stopping server: ${err}`);
  } finally {
    toggleServerBtn.disabled = false;
    updateUI();
  }
}

async function init() {
  try {
    // 1. Load saved settings or fallbacks
    const savedDir = await store.get("storageDir");
    if (savedDir) {
      state.storageDir = savedDir;
    } else {
      state.storageDir = await invoke("get_default_storage_dir");
      await store.set("storageDir", state.storageDir);
      await store.save();
    }

    const savedFtp = await store.get("ftpPort");
    if (savedFtp) state.ftpPort = savedFtp;

    const savedHttp = await store.get("httpPort");
    if (savedHttp) state.httpPort = savedHttp;

    updateUI();

    // 2. Auto-start server on launch
    await startServer();

    // 3. Listen for file uploads from FTP
    await listen("ftp-file-received", (event) => {
      const payload = event.payload;
      state.uploadCount++;
      updateUI();

      if (emptyState && emptyState.parentElement) {
        emptyState.style.display = "none";
      }

      const item = document.createElement("div");
      item.className = "activity-item";

      const icon = getFileIcon(payload.filename);
      const sizeStr = formatBytes(payload.size_bytes);
      const timeStr = new Date().toLocaleTimeString();

      item.innerHTML = `
        <div class="activity-left">
          <span class="activity-icon">${icon}</span>
          <span class="activity-name" title="${payload.relative_path}">${payload.relative_path}</span>
        </div>
        <div class="activity-right">
          <span>${sizeStr}</span>
          <span>${timeStr}</span>
          <span style="color: var(--success);">✓</span>
        </div>
      `;

      activityList.prepend(item);
    });
  } catch (err) {
    console.error("Initialization error:", err);
    showToast(`Init error: ${err}`);
  }
}

// Event Listeners
toggleServerBtn.addEventListener("click", () => {
  if (state.isRunning) {
    stopServer();
  } else {
    startServer();
  }
});

changeFolderBtn.addEventListener("click", async () => {
  try {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      defaultPath: state.storageDir,
    });
    if (selected) {
      state.storageDir = selected;
      await store.set("storageDir", selected);
      await store.save();
      updateUI();

      if (state.isRunning) {
        showToast("Storage folder changed. Restarting server...");
        await stopServer();
        await startServer();
      } else {
        showToast("Storage folder updated");
      }
    }
  } catch (err) {
    showToast(`Failed to select directory: ${err}`);
  }
});

openFolderBtn.addEventListener("click", async () => {
  if (!state.storageDir) return;
  try {
    await openPath(state.storageDir);
  } catch (err) {
    showToast(`Failed to open folder: ${err}`);
  }
});

previewSiteBtn.addEventListener("click", async () => {
  try {
    const url = `http://127.0.0.1:${state.httpPort}`;
    await openUrl(url);
  } catch (err) {
    showToast(`Failed to open preview: ${err}`);
  }
});

ftpPortInput.addEventListener("change", () => {
  vPort.textContent = ftpPortInput.value;
});

copyVegaBtn.addEventListener("click", () => {
  const configText = `Host: 127.0.0.1\nPort: ${state.ftpPort}\nUsername: vega\nPassword: vega\nDirectory: /`;
  navigator.clipboard.writeText(configText).then(() => {
    showToast("📋 Vega FTP settings copied to clipboard!");
  }).catch(() => {
    showToast("Could not access clipboard");
  });
});

clearLogsBtn.addEventListener("click", () => {
  activityList.innerHTML = `
    <div class="empty-state" id="emptyState">
      <span>📡 Waiting for Vega upload...</span>
      <span style="font-size: 0.75rem;">Run Vega Chess and publish rounds to see live uploads here</span>
    </div>
  `;
  state.uploadCount = 0;
  updateUI();
});

checkUpdateBtn.addEventListener("click", async () => {
  try {
    checkUpdateBtn.disabled = true;
    checkUpdateBtn.textContent = "Checking...";
    const update = await checkUpdate();
    if (update?.available) {
      showToast(`Update v${update.version} available! Downloading...`);
      await update.downloadAndInstall();
      showToast("Update installed! Please restart the app.");
    } else {
      showToast("You are running the latest version!");
    }
  } catch (err) {
    showToast(`Update check failed: ${err}`);
  } finally {
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.textContent = "Check for Updates";
  }
});

// Start app
init();
