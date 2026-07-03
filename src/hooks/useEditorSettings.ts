import { useState, useCallback } from "react";

const STORAGE_KEY = "dreamweave_editor_settings";

export interface EditorSettings {
  defaultBubbleFont: string;
  /** Guide de lecture mobile sur le canvas : lignes d'écran ~1500px + zone header ~300px. */
  showMobileGuide: boolean;
}

const DEFAULT_SETTINGS: EditorSettings = {
  defaultBubbleFont: "inherit",
  showMobileGuide: false,
};

export function useEditorSettings() {
  const [settings, setSettings] = useState<EditorSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<EditorSettings>) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = useCallback((updates: Partial<EditorSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* storage indisponible */ }
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
