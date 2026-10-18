import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { ServiceStatus, AuthInfo } from "../types/server";

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
      const status = await invoke<ServiceStatus>("get_services_status");
      const auth = await invoke<AuthInfo>("get_auth_info").catch((): AuthInfo => ({
        username: "hbcc",
        usernames: ["hbcc"],
        auth_mode: "permissive" as const,
      }));

      const resolvedUser =
        auth.username ||
        (auth.usernames && auth.usernames.length > 0 ? auth.usernames[0] : "hbcc");

      set((state) => ({
        isRunning: status.is_running,
        ftpPort: status.ftp_port || 2121,
        httpPort: status.http_port || 8080,
        lanIp: status.local_ip || state.lanIp,
        storageDir: status.storage_dir || state.storageDir,
        username: resolvedUser,
        authMode: auth.auth_mode || "permissive",
      }));
    } catch (err) {
      console.error("Failed to get services status:", err);
    }
  },

  startServices: async (storageDir, allowLan = true, ftpPort, httpPort) => {
    if (get().isLoading) return false;
    set({ isLoading: true });
    try {
      const targetDir = storageDir || get().storageDir;
      const targetHost = allowLan ? "0.0.0.0" : "127.0.0.1";
      const targetFtp = ftpPort || get().ftpPort;
      const targetHttp = httpPort || get().httpPort;

      const status = await invoke<ServiceStatus>("start_services", {
        host: targetHost,
        ftpPort: targetFtp,
        httpPort: targetHttp,
        storageDir: targetDir,
      });

      if (status) {
        set((state) => ({
          isRunning: status.is_running,
          ftpPort: status.ftp_port || targetFtp,
          httpPort: status.http_port || targetHttp,
          lanIp: status.local_ip || state.lanIp,
          storageDir: status.storage_dir || targetDir,
        }));
      }

      await get().refreshStatus();

      // If LAN IP wasn't resolved by UDP socket, fallback to WebRTC candidate
      if (allowLan && (!get().lanIp || get().lanIp === "127.0.0.1")) {
        await get().discoverLanIp();
      }

      return true;
    } catch (err) {
      console.error("Failed to start services:", err);
      // Even if already running error (e.g. strict mode re-mount), sync actual state
      await get().refreshStatus();
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  stopServices: async () => {
    if (get().isLoading) return false;
    set({ isLoading: true });
    try {
      await invoke("stop_services");
      set({ isRunning: false });
      await get().refreshStatus();
      return true;
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
