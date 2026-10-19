import { useEffect } from "react";
import { useSettingsStore } from "../stores/useSettingsStore";

export function useTheme() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    updateSetting("theme", theme === "dark" ? "light" : "dark");
  };

  return { theme, toggleTheme };
}
