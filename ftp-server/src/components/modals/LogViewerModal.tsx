import React, { useRef, useEffect, useState, useMemo } from "react";
import { Terminal, Search, Copy, Check, Trash2, ArrowDownCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useLogStore } from "../../stores/useLogStore";
import { LogLevel } from "../../types/logs";

export const LogViewerModal: React.FC = () => {
  const isModalOpen = useLogStore((s) => s.isModalOpen);
  const setModalOpen = useLogStore((s) => s.setModalOpen);
  const logs = useLogStore((s) => s.logs);
  const clearLogs = useLogStore((s) => s.clearLogs);
  const copyLogs = useLogStore((s) => s.copyLogs);
  const levelFilter = useLogStore((s) => s.levelFilter);
  const setLevelFilter = useLogStore((s) => s.setLevelFilter);
  const searchQuery = useLogStore((s) => s.searchQuery);
  const setSearchQuery = useLogStore((s) => s.setSearchQuery);
  const autoScroll = useLogStore((s) => s.autoScroll);
  const setAutoScroll = useLogStore((s) => s.setAutoScroll);

  const [copied, setCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    return {
      all: logs.length,
      info: logs.filter((l) => l.level === "info").length,
      warn: logs.filter((l) => l.level === "warn").length,
      error: logs.filter((l) => l.level === "error").length,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (levelFilter !== "all" && log.level !== levelFilter) return false;
      if (!q) return true;
      return (
        log.message.toLowerCase().includes(q) ||
        log.source.toLowerCase().includes(q) ||
        log.timestamp.toLowerCase().includes(q)
      );
    });
  }, [logs, levelFilter, searchQuery]);

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  if (!isModalOpen) return null;

  const handleCopy = async () => {
    try {
      await copyLogs();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "FTP":
        return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
      case "HTTP":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "PARSER":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "CLOUD":
        return "bg-sky-500/20 text-sky-400 border-sky-500/30";
      case "GITHUB":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getLevelTextColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-rose-400 font-medium";
      case "warn":
        return "text-amber-300 font-medium";
      default:
        return "text-slate-300";
    }
  };

  const filterButtons: { label: string; value: LogLevel; count: number; icon: React.ReactNode }[] = [
    { label: "All", value: "all", count: counts.all, icon: null },
    { label: "Info", value: "info", count: counts.info, icon: <Info className="w-3 h-3 text-sky-400" /> },
    { label: "Warn", value: "warn", count: counts.warn, icon: <AlertTriangle className="w-3 h-3 text-amber-400" /> },
    { label: "Error", value: "error", count: counts.error, icon: <AlertCircle className="w-3 h-3 text-rose-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Full Log Inspector</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {logs.length} events buffered • Showing {filteredLogs.length} matching entries
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg border transition ${
                autoScroll
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <ArrowDownCircle className={`w-3.5 h-3.5 ${autoScroll ? "text-indigo-400" : "text-slate-500"}`} />
              <span>Auto-scroll</span>
            </button>

            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy All"}</span>
            </button>

            <button
              onClick={clearLogs}
              className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 border border-slate-700 hover:border-rose-900 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              onClick={() => setModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setLevelFilter(btn.value)}
                className={`inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-md transition font-medium ${
                  levelFilter === btn.value
                    ? "bg-slate-700 text-white shadow-sm"
                    : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {btn.icon}
                <span>{btn.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-400">
                  {btn.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords, source, or message..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Large Scrollable Terminal */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-1.5 select-text bg-[#090d16]"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">
              {logs.length === 0 ? "Log console is idle." : "No logs match current filter."}
            </div>
          ) : (
            filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start space-x-2.5 hover:bg-slate-800/50 px-2 py-1 rounded transition"
              >
                <span className="text-slate-500 text-[11px] flex-shrink-0 select-none">
                  {entry.timestamp}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold tracking-wider flex-shrink-0 uppercase ${getSourceBadgeColor(
                    entry.source
                  )}`}
                >
                  {entry.source}
                </span>
                <span className={`break-all ${getLevelTextColor(entry.level)}`}>
                  {entry.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
