import React from "react";
import { Server, ExternalLink, RefreshCw, Settings, Play, Square } from "lucide-react";
import { useServerStore } from "../../stores/useServerStore";
import { useUpdaterStore } from "../../stores/useUpdaterStore";
import { openUrl } from "@tauri-apps/plugin-opener";

interface HeaderProps {
  currentView: "dashboard" | "settings";
  onViewChange: (view: "dashboard" | "settings") => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const isRunning = useServerStore((s) => s.isRunning);
  const isLoading = useServerStore((s) => s.isLoading);
  const ftpPort = useServerStore((s) => s.ftpPort);
  const httpPort = useServerStore((s) => s.httpPort);
  const startServices = useServerStore((s) => s.startServices);
  const stopServices = useServerStore((s) => s.stopServices);

  const isCheckingUpdate = useUpdaterStore((s) => s.isChecking);
  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);
  const updateInfo = useUpdaterStore((s) => s.updateInfo);

  const handleToggle = async () => {
    if (isLoading) return;
    if (isRunning) {
      await stopServices();
    } else {
      await startServices();
    }
  };

  const handlePreviewSite = async () => {
    try {
      await openUrl(`http://localhost:${httpPort}/`);
    } catch (err) {
      console.error("Failed to open preview URL:", err);
    }
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur sticky top-0 z-30 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={() => onViewChange("dashboard")}
          className="flex items-center space-x-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-tight">
                HBCC Tournament Server
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                Vega
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Local FTP &amp; Preview Service</p>
          </div>
        </div>

        {/* Center: Server Quick Toggle */}
        <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-800/70 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-inner">
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isRunning
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30"
                : "bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
            } ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
            title={isRunning ? "Click to Stop Server" : "Click to Start Server"}
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isRunning ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isLoading ? "Updating..." : isRunning ? "Server Online" : "Server Offline"}</span>
          </button>

          {isRunning && (
            <div className="flex items-center space-x-1.5 pr-2 text-xs font-mono text-slate-600 dark:text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>:{ftpPort}</span>
            </div>
          )}
        </div>

        {/* Right Actions: Preview button, Update pill, Settings */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {isRunning && (
            <button
              onClick={handlePreviewSite}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              title="Open HTTP preview in your browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview Site</span>
            </button>
          )}

          <button
            onClick={() => checkForUpdates(false)}
            disabled={isCheckingUpdate}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              updateInfo?.available
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30"
                : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
            }`}
            title={updateInfo?.available ? `Update v${updateInfo.version} Available!` : "Check for software updates"}
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? "animate-spin" : ""}`} />
            <span>{updateInfo?.available ? `⚡ v${updateInfo.version} Available` : "⚡ v0.1.11"}</span>
          </button>

          <button
            onClick={() => onViewChange(currentView === "dashboard" ? "settings" : "dashboard")}
            className={`p-2 rounded-lg text-xs font-medium transition ${
              currentView === "settings"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            }`}
            title="Settings & Preferences"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
