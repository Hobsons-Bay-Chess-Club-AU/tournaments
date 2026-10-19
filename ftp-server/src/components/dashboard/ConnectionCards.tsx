import React, { useState } from "react";
import { Monitor, Wifi, KeyRound, Copy, Check } from "lucide-react";
import { useServerStore } from "../../stores/useServerStore";

export const ConnectionCards: React.FC = () => {
  const ftpPort = useServerStore((s) => s.ftpPort);
  const lanIp = useServerStore((s) => s.lanIp);
  const authMode = useServerStore((s) => s.authMode);
  const isRunning = useServerStore((s) => s.isRunning);

  const [copied, setCopied] = useState(false);

  const handleCopyVegaConfig = async () => {
    const hostStr =
      lanIp && lanIp !== "127.0.0.1"
        ? `127.0.0.1 (or ${lanIp} on LAN)`
        : "127.0.0.1";
    const text = [
      `Host: ${hostStr}`,
      `Port: ${ftpPort}`,
      `Directory: /`,
      `Passive Mode: Yes`,
      `Note: Enter your username and password configured in .env`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy Vega settings:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Localhost Connection Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                <Monitor className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                This Computer
              </span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isRunning
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {isRunning ? "Ready" : "Offline"}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">Host:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">127.0.0.1</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">FTP Port:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">:{ftpPort}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          Use when Vega is running on this exact computer.
        </p>
      </div>

      {/* 2. LAN IP Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                <Wifi className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Local WiFi / LAN
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Arbiter Laptop
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">LAN IP:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 select-all">
                {lanIp && lanIp !== "127.0.0.1" ? lanIp : "127.0.0.1 (Local Only)"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">FTP Port:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">:{ftpPort}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          Enter this IP on other laptops connected to the same WiFi.
        </p>
      </div>

      {/* 3. Credentials & 1-Click Copy Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900/50">
                <KeyRound className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Authentication
              </span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {authMode === "permissive" ? "Permissive" : "Secured (.env)"}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Credentials:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-sans">
                Configured in .env
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Directory:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                / (use /)
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleCopyVegaConfig}
          className={`w-full mt-3 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
            copied
              ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30"
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied to Clipboard!" : "Copy Vega FTP Settings"}</span>
        </button>
      </div>
    </div>
  );
};
