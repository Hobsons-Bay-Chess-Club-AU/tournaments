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
  const settings = useSettingsStore((s) => s.settings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  const checkForUpdates = useUpdaterStore((s) => s.checkForUpdates);

  useEffect(() => {
    const initApp = async () => {
      // 1. Load persisted settings
      await loadSettings();

      // 2. Resolve default storage directory if not configured
      let activeDir = settings.storageDir;
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

      // 3. Refresh status from backend
      await refreshStatus();

      // 4. Auto-discover LAN IP
      await discoverLanIp();

      // 5. Auto-start services if configured
      if (settings.autoStart) {
        await startServices(
          activeDir,
          settings.allowLan,
          settings.ftpPort,
          settings.httpPort
        );
      }

      // 6. Silent check for updates on startup
      checkForUpdates(true).catch((e) => {
        console.debug("Silent startup update check error:", e);
      });
    };

    initApp();
  }, [loadSettings, refreshStatus, discoverLanIp, setStorageDir, updateSetting, checkForUpdates]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <Header currentView={currentView} onViewChange={setCurrentView} />

      {/* Tab Navigation */}
      <Navigation currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {currentView === "dashboard" ? (
          <>
            <StorageBanner />
            <ConnectionCards />
            <UploadsList />
            <InlineLogs />
          </>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            <ServerSettings />
            <CloudSettings />
            <GitHubSettings />
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
