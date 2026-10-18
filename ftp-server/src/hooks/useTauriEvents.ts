import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useLogStore } from "../stores/useLogStore";
import { useUploadStore } from "../stores/useUploadStore";

export function useTauriEvents() {
  const addLog = useLogStore((s) => s.addLog);
  const addUpload = useUploadStore((s) => s.addUpload);

  useEffect(() => {
    let unlistenLog: (() => void) | undefined;
    let unlistenUpload: (() => void) | undefined;

    listen<any>("server-log", (event) => {
      const payload = event.payload;
      if (typeof payload === "string") {
        addLog("info", "SYSTEM", payload);
      } else if (payload && payload.message) {
        addLog(payload.level || "info", payload.source || "SYSTEM", payload.message);
      }
    }).then((unsub) => {
      unlistenLog = unsub;
    });

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
        addLog("info", "FTP", `Received upload for tournament: ${data.tournamentName || data.folder}`);
      }
    }).then((unsub) => {
      unlistenUpload = unsub;
    });

    return () => {
      if (unlistenLog) unlistenLog();
      if (unlistenUpload) unlistenUpload();
    };
  }, [addLog, addUpload]);
}
