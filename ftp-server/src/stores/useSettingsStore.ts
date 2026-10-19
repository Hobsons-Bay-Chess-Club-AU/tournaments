import { create } from "zustand";
import { LazyStore } from "@tauri-apps/plugin-store";
import { AppSettings } from "../types/settings";

const store = new LazyStore("settings.json");

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    storageDir: "",
    ftpPort: 2121,
    httpPort: 8080,
    allowLan: true,
    autoStart: true,
    enableGithubSync: true,
    theme: "dark",
  },
  isLoaded: false,

  loadSettings: async () => {
    try {
      const stored = await store.get<Partial<AppSettings>>("config");
      if (stored) {
        set((state) => ({
          settings: { ...state.settings, ...stored },
          isLoaded: true,
        }));
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  updateSetting: async (key, value) => {
    const updated = { ...get().settings, [key]: value };
    set({ settings: updated });
    try {
      await store.set("config", updated);
      await store.save();
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  },
}));
