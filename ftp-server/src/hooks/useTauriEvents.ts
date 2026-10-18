import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useLogStore } from "../stores/useLogStore";
import { useUploadStore } from "../stores/useUploadStore";
import { LogSource } from "../types/logs";

interface SystemLogEventPayload {
  id?: string;
  timestamp?: string;
  level: string;
  source: string;
  message: string;
}

interface FtpFileReceivedPayload {
  filename: string;
  relative_path: string;
  size_bytes: number;
  timestamp: string;
}

export function useTauriEvents() {
  const addLog = useLogStore((s) => s.addLog);
  const addUpload = useUploadStore((s) => s.addUpload);

  useEffect(() => {
    let unlistenSysLog: (() => void) | undefined;
    let unlistenServerLog: (() => void) | undefined;
    let unlistenFileRecv: (() => void) | undefined;
    let unlistenUpload: (() => void) | undefined;

    const handleLog = (levelStr: string, sourceStr: string, msg: string) => {
      let lvl: "info" | "warn" | "error" = "info";
      const lowerLvl = levelStr.toLowerCase();
      if (lowerLvl.includes("warn")) lvl = "warn";
      else if (lowerLvl.includes("err")) lvl = "error";

      let src: LogSource = "SYSTEM";
      const upperSrc = sourceStr.toUpperCase();
      if (upperSrc.includes("FTP")) src = "FTP";
      else if (upperSrc.includes("HTTP")) src = "HTTP";
      else if (upperSrc.includes("PARSER")) src = "PARSER";
      else if (upperSrc.includes("CLOUD") || upperSrc.includes("SUPABASE")) src = "CLOUD";
      else if (upperSrc.includes("GIT")) src = "GITHUB";

      addLog(lvl, src, msg);
    };

    // Listen to "system-log" from Rust backend
    listen<SystemLogEventPayload>("system-log", (event) => {
      const p = event.payload;
      if (p) {
        handleLog(p.level || "INFO", p.source || "System", p.message || "");
      }
    }).then((unsub) => {
      unlistenSysLog = unsub;
    });

    // Listen to legacy/alternative "server-log"
    listen<any>("server-log", (event) => {
      const payload = event.payload;
      if (typeof payload === "string") {
        handleLog("INFO", "SYSTEM", payload);
      } else if (payload && payload.message) {
        handleLog(payload.level || "INFO", payload.source || "SYSTEM", payload.message);
      }
    }).then((unsub) => {
      unlistenServerLog = unsub;
    });

    // Listen to "ftp-file-received" from Rust backend
    listen<FtpFileReceivedPayload>("ftp-file-received", (event) => {
      const p = event.payload;
      if (p) {
        const relPath = p.relative_path || p.filename || "";
        const parts = relPath.replace(/\\/g, "/").split("/");
        const folder = parts.length > 1 ? parts.slice(0, parts.length - 1).join("/") : relPath;
        const tournamentName = parts.length > 1 ? parts[parts.length - 2] : parts[0] || "Tournament Upload";

        addUpload({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tournamentName,
          folder,
          timestamp: new Date().toLocaleTimeString(),
          success: true,
          message: `${p.filename} (${(p.size_bytes / 1024).toFixed(1)} KB)`,
        });
      }
    }).then((unsub) => {
      unlistenFileRecv = unsub;
    });

    // Listen to "ftp-upload" with structured parser stats
    listen<any>("ftp-upload", (event) => {
      const data = event.payload;
      if (data) {
        addUpload({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tournamentName: data.tournamentName || "Tournament Upload",
          folder: data.folder || "",
          timestamp: new Date().toLocaleTimeString(),
          playerCount: data.playerCount,
          category: data.category,
          supabaseStatus: data.supabase,
          githubStatus: data.github,
          filesGenerated: data.filesGenerated,
          success: data.success !== false,
          message: data.message,
        });
        handleLog("INFO", "FTP", `Received upload for tournament: ${data.tournamentName || data.folder}`);
      }
    }).then((unsub) => {
      unlistenUpload = unsub;
    });

    return () => {
      if (unlistenSysLog) unlistenSysLog();
      if (unlistenServerLog) unlistenServerLog();
      if (unlistenFileRecv) unlistenFileRecv();
      if (unlistenUpload) unlistenUpload();
    };
  }, [addLog, addUpload]);
}
