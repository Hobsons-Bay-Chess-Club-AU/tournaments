import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { ServicesStatus, AuthInfo } from "../types/server";

interface ServerState {
  isRunning: boolean;
  isLoading: boolean;
  ftpPort: number;
  httpPort: number;
  host: string;
  lanIp: string;
  storageDir: string;
  username: string;
  authMode: "permissive" | "keypair";
  startServices: (storageDir?: string, allowLan?: boolean, ftpPort?: number, httpPort?: number) => Promise<boolean>;
  stopServices: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  setStorageDir: (dir: string) => void;
  discoverLanIp: () => Promise<void>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  isRunning: false,
  isLoading: false,
  ftpPort: 2121,
  httpPort: 8080,
  host: "127.0.0.1",
  lanIp: "",
  storageDir: "",
  username: "hbcc",
  authMode: "permissive",

  refreshStatus: async () => {
    try {
      const status = await invoke<ServicesStatus>("get_services_status");
      const auth = await invoke<AuthInfo>("get_auth_info").catch(() => ({ username: "hbcc", auth_mode: "permissive" as const }));
      set({
        isRunning: status.ftp_running && status.http_running,
        ftpPort: status.ftp_port || 2121,
        httpPort: status.http_port || 8080,
        host: status.host || "127.0.0.1",
        storageDir: status.storage_dir || get().storageDir,
        username: auth.username || "hbcc",
        authMode: auth.auth_mode || "permissive",
      });
    } catch (err) {
      console.error("Failed to get services status:", err);
    }
  },

  startServices: async (storageDir, allowLan, ftpPort, httpPort) => {
    set({ isLoading: true });
    try {
      const targetDir = storageDir || get().storageDir;
      const targetHost = allowLan ? "0.0.0.0" : "127.0.0.1";
      const targetFtp = ftpPort || get().ftpPort;
      const targetHttp = httpPort || get().httpPort;

      const success = await invoke<boolean>("start_services", {
        host: targetHost,
        ftpPort: targetFtp,
        httpPort: targetHttp,
        storageDir: targetDir,
      });

      if (success) {
        await get().refreshStatus();
        if (allowLan) {
          await get().discoverLanIp();
        }
      }
      return success;
    } catch (err) {
      console.error("Failed to start services:", err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  stopServices: async () => {
    set({ isLoading: true });
    try {
      const success = await invoke<boolean>("stop_services");
      if (success) {
        set({ isRunning: false });
      }
      return success;
    } catch (err) {
      console.error("Failed to stop services:", err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  setStorageDir: (dir) => set({ storageDir: dir }),

  discoverLanIp: async () => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate) return;
        const candidate = event.candidate.candidate;
        const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (ipMatch && !ipMatch[1].startsWith("127.")) {
          set({ lanIp: ipMatch[1] });
          pc.close();
        }
      };
    } catch {
      // Fallback
    }
  },
}));
