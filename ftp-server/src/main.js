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

// Activity Tabs & Action Buttons
const tabUploadsBtn = document.getElementById("tabUploadsBtn");
const tabLogsBtn = document.getElementById("tabLogsBtn");
const uploadsPanel = document.getElementById("uploadsPanel");
const logsPanel = document.getElementById("logsPanel");
const logsBadge = document.getElementById("logsBadge");
const logErrorDot = document.getElementById("logErrorDot");
const viewLogsModalBtn = document.getElementById("viewLogsModalBtn");
const copyLogsBtn = document.getElementById("copyLogsBtn");

// Inline Log Filters
const logSearchInput = document.getElementById("logSearchInput");
const clearLogSearchBtn = document.getElementById("clearLogSearchBtn");
const logSourceFilter = document.getElementById("logSourceFilter");
const logAutoScrollInput = document.getElementById("logAutoScrollInput");
const systemLogList = document.getElementById("systemLogList");
const countAll = document.getElementById("countAll");
const countInfo = document.getElementById("countInfo");
const countWarn = document.getElementById("countWarn");
const countError = document.getElementById("countError");

// Modal Elements
const logViewerModal = document.getElementById("logViewerModal");
const closeLogsModalBtn = document.getElementById("closeLogsModalBtn");
const modalDismissBtn = document.getElementById("modalDismissBtn");
const modalLogSearchInput = document.getElementById("modalLogSearchInput");
const clearModalLogSearchBtn = document.getElementById("clearModalLogSearchBtn");
const modalLogSourceFilter = document.getElementById("modalLogSourceFilter");
const modalSystemLogList = document.getElementById("modalSystemLogList");
const modalLogStats = document.getElementById("modalLogStats");
const modalExportLogsBtn = document.getElementById("modalExportLogsBtn");
const modalCopyLogsBtn = document.getElementById("modalCopyLogsBtn");
const modalClearLogsBtn = document.getElementById("modalClearLogsBtn");
const modalCountAll = document.getElementById("modalCountAll");
const modalCountInfo = document.getElementById("modalCountInfo");
const modalCountWarn = document.getElementById("modalCountWarn");
const modalCountError = document.getElementById("modalCountError");

let currentActivityTab = "uploads";
let systemLogs = [];
let errorCount = 0;
let inlineLogLevel = "ALL";
let modalLogLevel = "ALL";

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
const headerUpdateBtn = document.getElementById("headerUpdateBtn");
const dashVersionBadge = document.getElementById("dashVersionBadge");
const toast = document.getElementById("toast");

// Blocking Update Modal Elements
const updateBlockingModal = document.getElementById("updateBlockingModal");
const blockingUpdateIcon = document.getElementById("blockingUpdateIcon");
const blockingUpdateTitle = document.getElementById("blockingUpdateTitle");
const blockingCurrentVer = document.getElementById("blockingCurrentVer");
const blockingTargetVer = document.getElementById("blockingTargetVer");
const blockingUpdateDesc = document.getElementById("blockingUpdateDesc");
const blockingProgressContainer = document.getElementById("blockingProgressContainer");
const blockingProgressBar = document.getElementById("blockingProgressBar");
const blockingProgressPercent = document.getElementById("blockingProgressPercent");
const blockingProgressBytes = document.getElementById("blockingProgressBytes");
const blockingUpdateError = document.getElementById("blockingUpdateError");
const blockingErrorText = document.getElementById("blockingErrorText");
const blockingStartUpdateBtn = document.getElementById("blockingStartUpdateBtn");
const blockingRestartBtn = document.getElementById("blockingRestartBtn");
const blockingErrorActions = document.getElementById("blockingErrorActions");
const blockingRetryBtn = document.getElementById("blockingRetryBtn");
const blockingDismissErrorBtn = document.getElementById("blockingDismissErrorBtn");

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

    // Check if app was just updated to a newer version
    const appVerEl = document.getElementById("appVersion");
    const currentAppVersion = appVerEl ? appVerEl.textContent.trim().replace(/^v/, "") : "";
    if (currentAppVersion) {
      const prevVersion = localStorage.getItem("hbcc_app_version");
      if (prevVersion && prevVersion !== currentAppVersion) {
        showToast(`🎉 Successfully updated to v${currentAppVersion}!`, 6000);
        appendSystemLog("System", "INFO", `Application upgraded from v${prevVersion} to v${currentAppVersion}`);
      }
      localStorage.setItem("hbcc_app_version", currentAppVersion);
    }

    // 2. Auto-start server on launch
    await startServer();

    // 3. Auto-update check on startup: if an update is found, block UI, show live progress and force restart
    checkForUpdateAndPrompt(true).catch((e) =>
      console.debug("Startup auto-update check error:", e)
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

    // 5. Listen for system logs (Parser, Supabase, FTP, HTTP)
    await listen("system-log", (event) => {
      addLog(event.payload);
    });

    addLog({
      level: "INFO",
      source: "System",
      message: "HBCC Tournament Server initialized and listening for Vega events.",
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
  if (currentActivityTab === "uploads") {
    activityList.innerHTML = `
      <div class="empty-state" id="emptyState">
        <span>📡 Waiting for Vega upload...</span>
        <span style="font-size: 0.75rem;">Run Vega Chess and publish rounds to see live uploads here</span>
      </div>
    `;
    state.uploadCount = 0;
    updateUI();
    showToast("Cleared upload activity");
  } else {
    systemLogs = [];
    errorCount = 0;
    updateLogCounts();
    renderLogs();
    showToast("Cleared system logs");
  }
});

// ==========================================================================
// Log Viewer Functions & Event Listeners
// ==========================================================================
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatLogTime(rawTs) {
  if (!rawTs) return new Date().toLocaleTimeString();
  const num = Number(rawTs);
  if (isNaN(num)) return new Date().toLocaleTimeString();
  const d = num > 1e11 ? new Date(num) : new Date(num * 1000);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function addLog(payload) {
  const entry = {
    id: payload.id || `log_${Date.now()}_${Math.random()}`,
    timestamp: payload.timestamp || String(Date.now() / 1000),
    formattedTime: formatLogTime(payload.timestamp),
    level: (payload.level || "INFO").toUpperCase(),
    source: payload.source || "System",
    message: payload.message || "",
  };

  systemLogs.push(entry);
  if (systemLogs.length > 2000) {
    systemLogs.shift();
  }

  if (entry.level === "ERROR") {
    errorCount++;
    if (logErrorDot) logErrorDot.style.display = "inline-block";
  }

  updateLogCounts();
  renderLogs();
  if (logViewerModal && logViewerModal.style.display !== "none") {
    renderModalLogs();
  }
}

function updateLogCounts() {
  const total = systemLogs.length;
  const infoC = systemLogs.filter((l) => l.level === "INFO").length;
  const warnC = systemLogs.filter((l) => l.level === "WARN").length;
  const errorC = systemLogs.filter((l) => l.level === "ERROR").length;

  if (logsBadge) logsBadge.textContent = total;
  if (countAll) countAll.textContent = total;
  if (countInfo) countInfo.textContent = infoC;
  if (countWarn) countWarn.textContent = warnC;
  if (countError) countError.textContent = errorC;

  if (modalCountAll) modalCountAll.textContent = total;
  if (modalCountInfo) modalCountInfo.textContent = infoC;
  if (modalCountWarn) modalCountWarn.textContent = warnC;
  if (modalCountError) modalCountError.textContent = errorC;

  if (errorC === 0 && logErrorDot) {
    logErrorDot.style.display = "none";
  }
}

function getFilteredLogs(logs, levelFilter, sourceFilter, query) {
  return logs.filter((log) => {
    if (levelFilter !== "ALL" && log.level !== levelFilter) {
      return false;
    }
    if (sourceFilter && log.source !== sourceFilter) {
      return false;
    }
    if (query) {
      const q = query.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchSrc = log.source.toLowerCase().includes(q);
      const matchLvl = log.level.toLowerCase().includes(q);
      if (!matchMsg && !matchSrc && !matchLvl) {
        return false;
      }
    }
    return true;
  });
}

function renderLogs() {
  if (!systemLogList) return;
  const q = logSearchInput ? logSearchInput.value.trim() : "";
  const src = logSourceFilter ? logSourceFilter.value : "";
  const filtered = getFilteredLogs(systemLogs, inlineLogLevel, src, q);

  if (clearLogSearchBtn) {
    clearLogSearchBtn.style.display = q ? "inline-block" : "none";
  }

  if (filtered.length === 0) {
    systemLogList.innerHTML = `
      <div class="empty-state" id="logEmptyState">
        <span>📋 No logs matching filters</span>
        <span style="font-size: 0.75rem;">Try adjusting search terms or level filters</span>
      </div>
    `;
    return;
  }

  systemLogList.innerHTML = filtered
    .map(
      (log) => `
      <div class="log-row level-${log.level}">
        <span class="log-time">${log.formattedTime}</span>
        <span class="log-level-badge badge-${log.level.toLowerCase()}">${log.level}</span>
        <span class="log-source-badge source-${log.source}">[${log.source}]</span>
        <span class="log-message">${escapeHtml(log.message)}</span>
      </div>
    `
    )
    .join("");

  if (logAutoScrollInput && logAutoScrollInput.checked) {
    systemLogList.scrollTop = systemLogList.scrollHeight;
  }
}

function renderModalLogs() {
  if (!modalSystemLogList) return;
  const q = modalLogSearchInput ? modalLogSearchInput.value.trim() : "";
  const src = modalLogSourceFilter ? modalLogSourceFilter.value : "";
  const filtered = getFilteredLogs(systemLogs, modalLogLevel, src, q);

  if (clearModalLogSearchBtn) {
    clearModalLogSearchBtn.style.display = q ? "inline-block" : "none";
  }

  if (modalLogStats) {
    const errorC = systemLogs.filter((l) => l.level === "ERROR").length;
    const warnC = systemLogs.filter((l) => l.level === "WARN").length;
    modalLogStats.textContent = `Showing ${filtered.length} of ${systemLogs.length} logs (${errorC} errors, ${warnC} warnings)`;
  }

  if (filtered.length === 0) {
    modalSystemLogList.innerHTML = `
      <div class="empty-state">
        <span>📋 No logs matching filters</span>
        <span style="font-size: 0.75rem;">Adjust search query or filter pills above</span>
      </div>
    `;
    return;
  }

  modalSystemLogList.innerHTML = filtered
    .map(
      (log) => `
      <div class="log-row level-${log.level}">
        <span class="log-time">${log.formattedTime}</span>
        <span class="log-level-badge badge-${log.level.toLowerCase()}">${log.level}</span>
        <span class="log-source-badge source-${log.source}">[${log.source}]</span>
        <span class="log-message">${escapeHtml(log.message)}</span>
      </div>
    `
    )
    .join("");

  modalSystemLogList.scrollTop = modalSystemLogList.scrollHeight;
}

function switchActivityTab(tab) {
  currentActivityTab = tab;
  if (tab === "uploads") {
    tabUploadsBtn.classList.add("active");
    tabLogsBtn.classList.remove("active");
    uploadsPanel.style.display = "flex";
    logsPanel.style.display = "none";
    if (copyLogsBtn) copyLogsBtn.style.display = "none";
    if (clearLogsBtn) clearLogsBtn.textContent = "Clear";
  } else {
    tabLogsBtn.classList.add("active");
    tabUploadsBtn.classList.remove("active");
    uploadsPanel.style.display = "none";
    logsPanel.style.display = "flex";
    if (copyLogsBtn) copyLogsBtn.style.display = "inline-flex";
    if (clearLogsBtn) clearLogsBtn.textContent = "Clear Logs";
    renderLogs();
  }
}

function openLogModal() {
  if (logViewerModal) {
    logViewerModal.style.display = "flex";
    renderModalLogs();
  }
}

function closeLogModal() {
  if (logViewerModal) {
    logViewerModal.style.display = "none";
  }
}

function copyLogsToClipboard(logs) {
  if (!logs || logs.length === 0) {
    showToast("No logs to copy");
    return;
  }
  const text = logs
    .map((l) => `[${l.formattedTime}] [${l.level}] [${l.source}] ${l.message}`)
    .join("\n");
  navigator.clipboard
    .writeText(text)
    .then(() => showToast(`📋 Copied ${logs.length} logs to clipboard!`))
    .catch(() => showToast("Failed to copy logs"));
}

function exportLogsToFile(logs) {
  if (!logs || logs.length === 0) {
    showToast("No logs to export");
    return;
  }
  const text = logs
    .map((l) => `[${l.formattedTime}] [${l.level}] [${l.source}] ${l.message}`)
    .join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `hbcc-server-logs-${dateStr}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("📥 Exported log file!");
}

// Activity Tab Switch Listeners
if (tabUploadsBtn) tabUploadsBtn.addEventListener("click", () => switchActivityTab("uploads"));
if (tabLogsBtn) tabLogsBtn.addEventListener("click", () => switchActivityTab("logs"));

// Logs Button next to Clear (opens Easy Log Viewer Modal)
if (viewLogsModalBtn) viewLogsModalBtn.addEventListener("click", openLogModal);

// Inline Filter Listeners
if (logSearchInput) logSearchInput.addEventListener("input", () => renderLogs());
if (clearLogSearchBtn) {
  clearLogSearchBtn.addEventListener("click", () => {
    logSearchInput.value = "";
    renderLogs();
  });
}

document.querySelectorAll(".log-pill[data-level]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".log-pill[data-level]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    inlineLogLevel = pill.getAttribute("data-level") || "ALL";
    renderLogs();
  });
});

if (logSourceFilter) logSourceFilter.addEventListener("change", () => renderLogs());

// Modal Filter Listeners
if (modalLogSearchInput) modalLogSearchInput.addEventListener("input", () => renderModalLogs());
if (clearModalLogSearchBtn) {
  clearModalLogSearchBtn.addEventListener("click", () => {
    modalLogSearchInput.value = "";
    renderModalLogs();
  });
}

document.querySelectorAll(".log-pill[data-modal-level]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".log-pill[data-modal-level]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    modalLogLevel = pill.getAttribute("data-modal-level") || "ALL";
    renderModalLogs();
  });
});

if (modalLogSourceFilter) modalLogSourceFilter.addEventListener("change", () => renderModalLogs());

// Modal Close & Actions
if (closeLogsModalBtn) closeLogsModalBtn.addEventListener("click", closeLogModal);
if (modalDismissBtn) modalDismissBtn.addEventListener("click", closeLogModal);
if (logViewerModal) {
  logViewerModal.addEventListener("click", (e) => {
    if (e.target === logViewerModal) closeLogModal();
  });
}

if (copyLogsBtn) {
  copyLogsBtn.addEventListener("click", () => {
    const q = logSearchInput ? logSearchInput.value.trim() : "";
    const src = logSourceFilter ? logSourceFilter.value : "";
    copyLogsToClipboard(getFilteredLogs(systemLogs, inlineLogLevel, src, q));
  });
}

if (modalCopyLogsBtn) {
  modalCopyLogsBtn.addEventListener("click", () => {
    const q = modalLogSearchInput ? modalLogSearchInput.value.trim() : "";
    const src = modalLogSourceFilter ? modalLogSourceFilter.value : "";
    copyLogsToClipboard(getFilteredLogs(systemLogs, modalLogLevel, src, q));
  });
}

if (modalExportLogsBtn) {
  modalExportLogsBtn.addEventListener("click", () => {
    exportLogsToFile(systemLogs);
  });
}

if (modalClearLogsBtn) {
  modalClearLogsBtn.addEventListener("click", () => {
    systemLogs = [];
    errorCount = 0;
    updateLogCounts();
    renderLogs();
    renderModalLogs();
    showToast("Cleared all logs");
  });
}

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

let isDownloadingUpdate = false;
let activeUpdateObj = null;

async function startDownloadAndInstall(update) {
  if (isDownloadingUpdate) return;
  isDownloadingUpdate = true;
  activeUpdateObj = update;

  // Show progress container & reset state
  if (blockingProgressContainer) blockingProgressContainer.style.display = "flex";
  if (blockingProgressBar) blockingProgressBar.style.width = "0%";
  if (blockingProgressPercent) blockingProgressPercent.textContent = "0%";
  if (blockingProgressBytes) blockingProgressBytes.textContent = "Connecting to update server...";
  if (blockingUpdateError) blockingUpdateError.style.display = "none";
  if (blockingStartUpdateBtn) blockingStartUpdateBtn.style.display = "none";
  if (blockingRestartBtn) blockingRestartBtn.style.display = "none";
  if (blockingErrorActions) blockingErrorActions.style.display = "none";

  if (blockingUpdateIcon) blockingUpdateIcon.textContent = "⏳";
  if (blockingUpdateTitle) blockingUpdateTitle.textContent = `Downloading Update v${update.version}...`;
  if (blockingUpdateDesc) {
    blockingUpdateDesc.textContent =
      "Please wait while the update is downloaded and verified. The application is paused until the update completes.";
  }

  let totalBytes = 0;
  let downloadedBytes = 0;

  try {
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          totalBytes = event.data?.contentLength || 0;
          if (blockingProgressBytes) {
            blockingProgressBytes.textContent =
              totalBytes > 0 ? `0 B / ${formatBytes(totalBytes)}` : "Starting download...";
          }
          break;
        case "Progress":
          downloadedBytes += event.data.chunkLength;
          if (totalBytes > 0) {
            const pct = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
            if (blockingProgressBar) blockingProgressBar.style.width = `${pct}%`;
            if (blockingProgressPercent) blockingProgressPercent.textContent = `${pct}%`;
            if (blockingProgressBytes) {
              blockingProgressBytes.textContent = `${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)}`;
            }
          } else {
            if (blockingProgressBytes) {
              blockingProgressBytes.textContent = `${formatBytes(downloadedBytes)} downloaded`;
            }
            if (blockingProgressBar) blockingProgressBar.style.width = "60%";
          }
          break;
        case "Finished":
          if (blockingProgressBar) blockingProgressBar.style.width = "100%";
          if (blockingProgressPercent) blockingProgressPercent.textContent = "100%";
          if (blockingProgressBytes) blockingProgressBytes.textContent = "Installing update files...";
          break;
      }
    });

    // Update successfully installed! Force restart
    if (blockingUpdateIcon) blockingUpdateIcon.textContent = "🎉";
    if (blockingUpdateTitle) blockingUpdateTitle.textContent = "Update Installed — Restart Required";
    if (blockingUpdateDesc) {
      blockingUpdateDesc.textContent = `HBCC Tournament Server has been updated to v${update.version}. You must restart the application now to complete the update and apply changes.`;
    }

    // Hide progress bar, show ONLY prominent restart button
    if (blockingProgressContainer) blockingProgressContainer.style.display = "none";
    if (blockingRestartBtn) {
      blockingRestartBtn.style.display = "block";
      blockingRestartBtn.focus();
    }
    showToast(`Update v${update.version} installed! Please restart the app.`, 5000);
  } catch (err) {
    console.error("Update download/install error:", err);
    if (blockingUpdateIcon) blockingUpdateIcon.textContent = "⚠️";
    if (blockingUpdateTitle) blockingUpdateTitle.textContent = "Update Installation Failed";
    if (blockingUpdateDesc) {
      blockingUpdateDesc.textContent =
        "An error occurred while downloading or installing the update. Check your network connection and try again.";
    }
    if (blockingUpdateError) blockingUpdateError.style.display = "block";
    if (blockingErrorText) blockingErrorText.textContent = `⚠️ Error: ${err?.message || err}`;
    if (blockingProgressContainer) blockingProgressContainer.style.display = "none";
    if (blockingErrorActions) blockingErrorActions.style.display = "flex";
  } finally {
    isDownloadingUpdate = false;
  }
}

async function checkForUpdateAndPrompt(silent = false) {
  try {
    const update = await checkUpdate();
    if (update?.available) {
      activeUpdateObj = update;

      // Populate version badges
      if (blockingCurrentVer) {
        blockingCurrentVer.textContent = `Current: v${update.currentVersion}`;
      }
      if (blockingTargetVer) {
        blockingTargetVer.textContent = `Target: v${update.version}`;
      }
      if (update.body && blockingUpdateDesc) {
        blockingUpdateDesc.textContent = update.body;
      }

      // Display blocking modal overlay
      if (updateBlockingModal) {
        updateBlockingModal.style.display = "flex";
      }

      // Immediately start downloading & installing with live progress
      await startDownloadAndInstall(update);
      return true;
    } else if (!silent) {
      showToast("You are running the latest version!");
    }
  } catch (err) {
    if (!silent) {
      showToast(`Update check failed: ${err}`);
    } else {
      console.debug("Silent startup update check:", err);
    }
  }
  return false;
}

// Event Listeners for update actions
if (blockingRestartBtn) {
  blockingRestartBtn.addEventListener("click", async () => {
    try {
      blockingRestartBtn.disabled = true;
      blockingRestartBtn.textContent = "Restarting...";
      await invoke("restart_app");
    } catch (err) {
      console.error("Failed to restart app:", err);
      showToast(`Restart failed: ${err}`);
      blockingRestartBtn.disabled = false;
      blockingRestartBtn.textContent = "🚀 Restart Application Now";
    }
  });
}

if (blockingRetryBtn) {
  blockingRetryBtn.addEventListener("click", () => {
    if (activeUpdateObj) {
      startDownloadAndInstall(activeUpdateObj);
    }
  });
}

if (blockingDismissErrorBtn) {
  blockingDismissErrorBtn.addEventListener("click", () => {
    if (updateBlockingModal) {
      updateBlockingModal.style.display = "none";
    }
  });
}

checkUpdateBtn.addEventListener("click", async () => {
  try {
    checkUpdateBtn.disabled = true;
    checkUpdateBtn.textContent = "Checking...";
    await checkForUpdateAndPrompt(false);
  } finally {
    checkUpdateBtn.disabled = false;
    checkUpdateBtn.textContent = "Check for Updates";
  }
});

if (headerUpdateBtn) {
  headerUpdateBtn.addEventListener("click", async () => {
    try {
      headerUpdateBtn.disabled = true;
      headerUpdateBtn.textContent = "Checking...";
      await checkForUpdateAndPrompt(false);
    } finally {
      headerUpdateBtn.disabled = false;
      headerUpdateBtn.textContent = "🔄 Updates";
    }
  });
}

if (dashVersionBadge) {
  dashVersionBadge.addEventListener("click", async () => {
    await checkForUpdateAndPrompt(false);
  });
}

// Start app
init();
