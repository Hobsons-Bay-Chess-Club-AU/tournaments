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
  userCount: number;
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
  userCount: 0,
  authMode: "keypair",

  refreshStatus: async () => {
    try {
      const status = await invoke<ServiceStatus>("get_services_status");
      const auth = await invoke<AuthInfo>("get_auth_info").catch((): AuthInfo => ({
        user_count: 0,
        usernames: [],
      }));

      const raw = status as any;
      const isRunning = Boolean(raw.is_running ?? raw.isRunning);
      const ftpPort = Number(raw.ftp_port ?? raw.ftpPort ?? 2121);
      const httpPort = Number(raw.http_port ?? raw.httpPort ?? 8080);
      const lanIp = raw.local_ip ?? raw.localIp ?? null;
      const storageDir = raw.storage_dir ?? raw.storageDir ?? "";

      set((state) => ({
        isRunning,
        ftpPort,
        httpPort,
        lanIp: lanIp || state.lanIp,
        storageDir: storageDir || state.storageDir,
        userCount: auth.user_count ?? (auth.usernames ? auth.usernames.length : 0),
        authMode: auth.auth_mode || "keypair",
      }));
    } catch (err) {
      console.error("Failed to get services status:", err);
    }
  },

  startServices: async (storageDir, allowLan = true, ftpPort, httpPort) => {
    if (get().isLoading) return false;
    set({ isLoading: true });
    try {
      let targetDir = storageDir || get().storageDir;
      if (!targetDir) {
        try {
          const defaultDir = await invoke<string>("get_default_storage_dir");
          if (defaultDir) {
            targetDir = defaultDir;
            set({ storageDir: defaultDir });
          }
        } catch {
          // ignore
        }
      }

      const targetFtp = ftpPort || get().ftpPort || 2121;
      const targetHttp = httpPort || get().httpPort || 8080;

      const status = await invoke<ServiceStatus>("start_services", {
        ftpPort: targetFtp,
        httpPort: targetHttp,
        storageDir: targetDir,
      });

      if (status) {
        const raw = status as any;
        const isRunning = Boolean(raw.is_running ?? raw.isRunning ?? true);
        const ftpPortVal = Number(raw.ftp_port ?? raw.ftpPort ?? targetFtp);
        const httpPortVal = Number(raw.http_port ?? raw.httpPort ?? targetHttp);
        const lanIpVal = raw.local_ip ?? raw.localIp ?? null;
        const storageDirVal = raw.storage_dir ?? raw.storageDir ?? targetDir;

        set((state) => ({
          isRunning,
          ftpPort: ftpPortVal,
          httpPort: httpPortVal,
          lanIp: lanIpVal || state.lanIp,
          storageDir: storageDirVal || targetDir,
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
      // If error was "Services are already running", update status to true
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
