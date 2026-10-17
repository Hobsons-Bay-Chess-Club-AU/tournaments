import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { LazyStore } from "@tauri-apps/plugin-store";

// Views & Navigation
const navDashboardBtn = document.getElementById("navDashboardBtn");
const navSettingsBtn = document.getElementById("navSettingsBtn");
const backToDashBtn = document.getElementById("backToDashBtn");
const dashboardView = document.getElementById("dashboardView");
const settingsView = document.getElementById("settingsView");

// Header Elements (Unified Toggle Control)
const serverToggleControl = document.getElementById("serverToggleControl");
const serverToggleInput = document.getElementById("serverToggleInput");
const serverToggleText = document.getElementById("serverToggleText");
const previewSiteBtn = document.getElementById("previewSiteBtn");

// Dashboard Elements
const dashFolderPath = document.getElementById("dashFolderPath");
const dashOpenFolderBtn = document.getElementById("dashOpenFolderBtn");
const vHost = document.getElementById("vHost");
const vPort = document.getElementById("vPort");
const vUser = document.getElementById("vUser");
const vPass = document.getElementById("vPass");
const authBadge = document.getElementById("authBadge");
const copyVegaBtn = document.getElementById("copyVegaBtn");
const uploadBadge = document.getElementById("uploadBadge");
const clearLogsBtn = document.getElementById("clearLogsBtn");
const activityList = document.getElementById("activityList");
const emptyState = document.getElementById("emptyState");

// Settings Elements
const settingsFolderPath = document.getElementById("settingsFolderPath");
const changeFolderBtn = document.getElementById("changeFolderBtn");
const openFolderBtn = document.getElementById("openFolderBtn");
const ftpPortInput = document.getElementById("ftpPortInput");
const httpPortInput = document.getElementById("httpPortInput");
const resetDefaultsBtn = document.getElementById("resetDefaultsBtn");
const applySettingsBtn = document.getElementById("applySettingsBtn");
const settingsVersion = document.getElementById("settingsVersion");
const checkUpdateBtn = document.getElementById("checkUpdateBtn");
const updateBanner = document.getElementById("updateBanner");
const updateIcon = document.getElementById("updateIcon");
const updateBannerText = document.getElementById("updateBannerText");
const restartAppBtn = document.getElementById("restartAppBtn");
const dismissUpdateBtn = document.getElementById("dismissUpdateBtn");
const toast = document.getElementById("toast");

// Store & Local State
const store = new LazyStore("settings.json");

let state = {
  isRunning: false,
  storageDir: "",
  ftpPort: 2121,
  httpPort: 8080,
  uploadCount: 0,
  authInfo: { user_count: 0, usernames: [] },
};

function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function switchTab(tab) {
  if (tab === "dashboard") {
    dashboardView.classList.add("active");
    settingsView.classList.remove("active");
    navDashboardBtn.classList.add("active");
    navSettingsBtn.classList.remove("active");
  } else {
    dashboardView.classList.remove("active");
    settingsView.classList.add("active");
    navDashboardBtn.classList.remove("active");
    navSettingsBtn.classList.add("active");
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
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
    serverToggleControl.className = "server-toggle-control online";
    serverToggleInput.checked = true;
    serverToggleText.textContent = `Server Online (${state.ftpPort})`;
    previewSiteBtn.disabled = false;
    previewSiteBtn.style.opacity = "1";
    previewSiteBtn.style.pointerEvents = "auto";
  } else {
    serverToggleControl.className = "server-toggle-control offline";
    serverToggleInput.checked = false;
    serverToggleText.textContent = "Server Stopped";
    previewSiteBtn.disabled = true;
    previewSiteBtn.style.opacity = "0.5";
    previewSiteBtn.style.pointerEvents = "none";
  }

  const displayDir = state.storageDir || "Not set";
  if (dashFolderPath) {
    dashFolderPath.textContent = displayDir;
    dashFolderPath.title = displayDir;
  }
  if (settingsFolderPath) {
    settingsFolderPath.textContent = displayDir;
    settingsFolderPath.title = displayDir;
  }

  ftpPortInput.value = state.ftpPort;
  httpPortInput.value = state.httpPort;
  vPort.textContent = state.ftpPort;
  vHost.textContent = "127.0.0.1";
  uploadBadge.textContent = `${state.uploadCount} file${state.uploadCount === 1 ? "" : "s"}`;
}

async function startServer() {
  try {
    serverToggleControl.classList.add("busy");
    serverToggleText.textContent = "Starting...";

    const status = await invoke("start_services", {
      ftpPort: state.ftpPort,
      httpPort: state.httpPort,
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
    serverToggleControl.classList.remove("busy");
    updateUI();
  }
}

async function stopServer() {
  try {
    serverToggleControl.classList.add("busy");
    serverToggleText.textContent = "Stopping...";
    await invoke("stop_services");
    state.isRunning = false;
    showToast("Server stopped");
  } catch (err) {
    showToast(`Error stopping server: ${err}`);
  } finally {
    serverToggleControl.classList.remove("busy");
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

    try {
      const auth = await invoke("get_auth_info");
      state.authInfo = auth;
      if (auth.user_count === 1) {
        if (vUser) vUser.textContent = auth.usernames[0];
        if (vPass) vPass.textContent = "••••••••";
        if (authBadge) authBadge.textContent = `🔒 Protected: 1 authorized arbiter account (${auth.usernames[0]})`;
      } else if (auth.user_count > 1) {
        if (vUser) vUser.textContent = "Assigned Username";
        if (vPass) vPass.textContent = "Assigned Password";
        if (authBadge) authBadge.textContent = `🔒 Protected: ${auth.user_count} authorized arbiter accounts configured`;
      }
    } catch (authErr) {
      console.warn("Could not load auth info:", authErr);
    }

    updateUI();

    // 2. Auto-start server on launch
    await startServer();

    // 3. Background auto-update check on startup
    autoCheckAndInstallUpdate(true).catch((e) =>
      console.debug("Background auto-update check error:", e)
    );

    // 4. Listen for file uploads from FTP
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
      const timeStr = new Date(payload.timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const isJson = payload.filename === "data.json" || payload.filename === "data_clean.json";
      const tagHtml = isJson ? '<span class="tag-generated">Parsed JSON</span>' : "";
      const encodedPath = encodeURI(payload.relative_path.replace(/\\/g, "/"));
      const previewUrl = `http://127.0.0.1:${state.httpPort}/${encodedPath}`;

      item.innerHTML = `
        <div class="activity-left">
          <span class="activity-icon">${icon}</span>
          <span class="activity-name" title="${payload.relative_path}">${payload.relative_path}</span>
          ${tagHtml}
        </div>
        <div class="activity-right">
          <span>${sizeStr}</span>
          <button class="btn btn-xs preview-link" data-url="${previewUrl}">🌐 Preview</button>
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

// Navigation event listeners
navDashboardBtn.addEventListener("click", () => switchTab("dashboard"));
navSettingsBtn.addEventListener("click", () => switchTab("settings"));
backToDashBtn.addEventListener("click", () => switchTab("dashboard"));

// Unified iOS-style Server Toggle
serverToggleInput.addEventListener("change", () => {
  if (serverToggleInput.checked) {
    startServer();
  } else {
    stopServer();
  }
});

// Activity list click listener for file preview
activityList.addEventListener("click", async (e) => {
  const previewBtn = e.target.closest(".preview-link");
  if (previewBtn) {
    const url = previewBtn.getAttribute("data-url");
    if (url) {
      try {
        await openUrl(url);
      } catch (err) {
        showToast(`Failed to open preview: ${err}`);
      }
    }
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

// Vega config clipboard copy
copyVegaBtn.addEventListener("click", () => {
  const userStr =
    state.authInfo?.user_count === 1
      ? state.authInfo.usernames[0]
      : "<your_arbiter_username>";
  const passStr =
    state.authInfo?.user_count === 1 && state.authInfo.usernames[0] === "vega"
      ? "vega"
      : "<your_arbiter_password>";
  const configText = `Host: 127.0.0.1\nPort: ${state.ftpPort}\nUsername: ${userStr}\nPassword: ${passStr}\nDirectory: /`;
  navigator.clipboard
    .writeText(configText)
    .then(() => {
      showToast("📋 Vega FTP settings copied to clipboard!");
    })
    .catch(() => {
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

// Folder Actions
const handleOpenFolder = async () => {
  if (!state.storageDir) return;
  try {
    await invoke("open_folder", { path: state.storageDir });
  } catch (err) {
    try {
      await openPath(state.storageDir);
    } catch (innerErr) {
      showToast(`Failed to open folder: ${err || innerErr}`);
    }
  }
};

dashOpenFolderBtn.addEventListener("click", handleOpenFolder);
openFolderBtn.addEventListener("click", handleOpenFolder);

changeFolderBtn.addEventListener("click", async () => {
  try {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      defaultPath: state.storageDir,
    });
    if (selected) {
      state.storageDir = selected;
      updateUI();
      showToast("Storage folder selected. Click 'Save & Restart' to apply.");
    }
  } catch (err) {
    showToast(`Failed to select directory: ${err}`);
  }
});

// Settings Save / Reset Actions
applySettingsBtn.addEventListener("click", async () => {
  try {
    const newFtp = parseInt(ftpPortInput.value, 10);
    const newHttp = parseInt(httpPortInput.value, 10);

    if (isNaN(newFtp) || newFtp < 1 || newFtp > 65535) {
      showToast("Invalid FTP port (1-65535)");
      return;
    }
    if (isNaN(newHttp) || newHttp < 1 || newHttp > 65535) {
      showToast("Invalid HTTP port (1-65535)");
      return;
    }
    if (newFtp === newHttp) {
      showToast("FTP and HTTP ports cannot be the same!");
      return;
    }

    state.ftpPort = newFtp;
    state.httpPort = newHttp;

    await store.set("ftpPort", state.ftpPort);
    await store.set("httpPort", state.httpPort);
    await store.set("storageDir", state.storageDir);
    await store.save();

    if (state.isRunning) {
      showToast("Restarting server with updated configuration...");
      await stopServer();
      await startServer();
    } else {
      updateUI();
      showToast("Settings saved!");
    }

    // Switch back to dashboard view
    switchTab("dashboard");
  } catch (err) {
    showToast(`Failed to apply settings: ${err}`);
  }
});

resetDefaultsBtn.addEventListener("click", async () => {
  try {
    const defaultDir = await invoke("get_default_storage_dir");
    state.storageDir = defaultDir;
    state.ftpPort = 2121;
    state.httpPort = 8080;
    updateUI();
    showToast("Settings reset to defaults. Click 'Save & Restart' to apply.");
  } catch (err) {
    showToast(`Failed to reset defaults: ${err}`);
  }
});

function showUpdateNotification(message, icon = "✨", canRestart = false) {
  if (!updateBanner) return;
  updateBannerText.textContent = message;
  updateIcon.textContent = icon;
  restartAppBtn.style.display = canRestart ? "inline-flex" : "none";
  updateBanner.style.display = "flex";
}

function hideUpdateNotification() {
  if (updateBanner) updateBanner.style.display = "none";
}

async function autoCheckAndInstallUpdate(silent = true) {
  try {
    const update = await checkUpdate();
    if (update?.available) {
      showUpdateNotification(
        `New update v${update.version} found! Downloading in background...`,
        "⏳",
        false
      );
      showToast(`Downloading update v${update.version}...`);

      await update.downloadAndInstall();

      showUpdateNotification(
        `Update v${update.version} installed! Click restart to apply.`,
        "🎉",
        true
      );
      showToast(`Update v${update.version} installed! Please restart the app.`);
      return true;
    } else if (!silent) {
      showToast("You are running the latest version!");
    }
  } catch (err) {
    if (!silent) {
      showToast(`Update check failed: ${err}`);
    } else {
      console.debug("Silent background auto-update check:", err);
    }
  }
  return false;
}

restartAppBtn.addEventListener("click", async () => {
  try {
    await invoke("restart_app");
  } catch (err) {
    showToast(`Restart failed: ${err}`);
  }
});

dismissUpdateBtn.addEventListener("click", () => {
  hideUpdateNotification();
});

checkUpdateBtn.addEventListener("click", async () => {
  try {
    checkUpdateBtn.disabled = true;
    checkUpdateBtn.textContent = "Checking...";
    await autoCheckAndInstallUpdate(false);
  } finally {
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.textContent = "Check for Updates";
  }
});

// Start app
init();
