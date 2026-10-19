import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Header } from "./components/layout/Header";
import { Navigation } from "./components/layout/Navigation";
import { Footer } from "./components/layout/Footer";
import { StorageBanner } from "./components/dashboard/StorageBanner";
import { ConnectionCards } from "./components/dashboard/ConnectionCards";
import { UploadsList } from "./components/dashboard/UploadsList";
import { InlineLogs } from "./components/dashboard/InlineLogs";
import { ServerSettings } from "./components/settings/ServerSettings";
import { CloudSettings } from "./components/settings/CloudSettings";
import { GitHubSettings } from "./components/settings/GitHubSettings";
import { AppearanceSettings } from "./components/settings/AppearanceSettings";
import { BlockingUpdateModal } from "./components/modals/BlockingUpdateModal";
import { LogViewerModal } from "./components/modals/LogViewerModal";
import { ToastContainer } from "./components/modals/ToastContainer";
import { useTheme } from "./hooks/useTheme";
import { useTauriEvents } from "./hooks/useTauriEvents";
import { useServerStore } from "./stores/useServerStore";
import { useSettingsStore } from "./stores/useSettingsStore";
import { useUpdaterStore } from "./stores/useUpdaterStore";

export const App: React.FC = () => {
  // Initialize theme and global listeners
  useTheme();
  useTauriEvents();

  const [currentView, setCurrentView] = useState<"dashboard" | "settings">("dashboard");

  const setStorageDir = useServerStore((s) => s.setStorageDir);
  const refreshStatus = useServerStore((s) => s.refreshStatus);
  const startServices = useServerStore((s) => s.startServices);
  const discoverLanIp = useServerStore((s) => s.discoverLanIp);

  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);

  useEffect(() => {
    const initApp = async () => {
      // 0. Initialize dynamic application version
      await useUpdaterStore.getState().initVersion();

      // 1. Load persisted settings
      await loadSettings();
      const currentSettings = useSettingsStore.getState().settings;

      // 2. Resolve default storage directory if not configured
      let activeDir = currentSettings.storageDir;
      if (!activeDir) {
        try {
          const defaultDir = await invoke<string>("get_default_storage_dir");
          if (defaultDir) {
            activeDir = defaultDir;
            setStorageDir(defaultDir);
            await updateSetting("storageDir", defaultDir);
          }
        } catch (err) {
          console.error("Failed to get default storage directory:", err);
        }
      } else {
        setStorageDir(activeDir);
      }

      // 3. Refresh status from backend (includes local_ip detection)
      await refreshStatus();

      // 4. Auto-start services if configured and not already running
      if (currentSettings.autoStart && !useServerStore.getState().isRunning) {
        await startServices(
          activeDir,
          currentSettings.allowLan,
          currentSettings.ftpPort,
          currentSettings.httpPort
        );
      }

      // 5. Secondary check if LAN IP needs WebRTC fallback
      if (!useServerStore.getState().lanIp) {
        await discoverLanIp();
      }

      // 6. Startup auto-update check: if update exists, show blocking modal and download immediately
      checkForUpdates(true, true).catch((e) => {
        console.debug("Startup auto-update check error:", e);
      });
    };

    initApp();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <Header currentView={currentView} onViewChange={setCurrentView} />

      {/* Tab Navigation */}
      <Navigation currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {currentView === "dashboard" ? (
          <>
            <StorageBanner />
            <ConnectionCards />
            <UploadsList />
            <InlineLogs />
          </>
        ) : (
          <div className="space-y-6 w-full">
            <ServerSettings />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CloudSettings />
              <GitHubSettings />
            </div>
            <AppearanceSettings />
          </div>
        )}
      </main>

      {/* Sticky Bottom Footer */}
      <Footer />

      {/* Global Overlays & Modals */}
      <BlockingUpdateModal />
      <LogViewerModal />
      <ToastContainer />
    </div>
  );
};

export default App;
