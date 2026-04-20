import {
  getDefaultBeaconAppSettings,
  mergeBeaconAppSettings,
  parseBeaconAppSettings,
  type BeaconAppSettings,
} from "@codalyn/webflow-kit";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { towerFetch } from "@/shared/lib/tower-client";
import { ThemeProvider } from "@/shared/providers/theme-provider";

const STORAGE_KEY = "beacon:app-settings-v1";
const LEGACY_THEME_KEY = "beacon-ui-theme";
const LEGACY_FORMAT_KEY = "beacon:image-export-format";

export type BeaconSettingsSyncState = "idle" | "loading" | "synced" | "error";

type BeaconAppSettingsContextValue = {
  settings: BeaconAppSettings;
  updateSettings: (patch: Partial<BeaconAppSettings>) => void;
  syncState: BeaconSettingsSyncState;
  /** True when signed in to Tower (session may still be resolving). */
  isTowerUser: boolean;
  /** Persist export defaults from the image editor after Tower sync (or always for guests). */
  canPersistExportDefaults: boolean;
};

const BeaconAppSettingsContext = createContext<BeaconAppSettingsContextValue | undefined>(undefined);

function readLocal(): BeaconAppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return parseBeaconAppSettings(JSON.parse(raw));
    }
  } catch {
    /* ignore */
  }
  const base = getDefaultBeaconAppSettings();
  try {
    const merged: Partial<BeaconAppSettings> = {};
    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacyTheme === "light" || legacyTheme === "dark" || legacyTheme === "system") {
      merged.theme = legacyTheme;
    }
    const legacyFormat = localStorage.getItem(LEGACY_FORMAT_KEY);
    if (legacyFormat === "webp" || legacyFormat === "avif") {
      merged.defaultExportFormat = legacyFormat;
    }
    return mergeBeaconAppSettings(base, merged);
  } catch {
    /* ignore */
  }
  return base;
}

function writeLocal(settings: BeaconAppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function BeaconAppSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useBeaconTowerSession();
  const [settings, setSettings] = useState<BeaconAppSettings>(() => readLocal());
  const [syncState, setSyncState] = useState<BeaconSettingsSyncState>("idle");

  const isTowerUser = Boolean(user?.id);

  const canPersistExportDefaults = !isTowerUser || syncState === "synced";

  useEffect(() => {
    if (!user?.id) {
      setSettings(readLocal());
      setSyncState("idle");
      return;
    }

    const ac = new AbortController();
    setSyncState("loading");

    void towerFetch("/api/v1/beacon/settings", { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`settings ${r.status}`);
        }
        return r.json() as Promise<{ settings: BeaconAppSettings }>;
      })
      .then(({ settings: s }) => {
        setSettings(s);
        writeLocal(s);
        setSyncState("synced");
      })
      .catch(() => {
        if (ac.signal.aborted) {
          return;
        }
        setSyncState("error");
      });

    return () => ac.abort();
  }, [user?.id]);

  const updateSettings = useCallback(
    (patch: Partial<BeaconAppSettings>) => {
      setSettings((prev) => {
        const next = mergeBeaconAppSettings(prev, patch);
        writeLocal(next);
        return next;
      });
      if (user?.id) {
        void towerFetch("/api/v1/beacon/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      }
    },
    [user?.id]
  );

  const handleThemeChange = useCallback(
    (theme: BeaconAppSettings["theme"]) => {
      updateSettings({ theme });
    },
    [updateSettings]
  );

  const value = useMemo(
    (): BeaconAppSettingsContextValue => ({
      settings,
      updateSettings,
      syncState,
      isTowerUser,
      canPersistExportDefaults,
    }),
    [settings, updateSettings, syncState, isTowerUser, canPersistExportDefaults]
  );

  return (
    <BeaconAppSettingsContext.Provider value={value}>
      <ThemeProvider
        defaultTheme={settings.theme}
        storageKey="beacon-ui-theme"
        theme={settings.theme}
        onThemeChange={handleThemeChange}
      >
        {children}
      </ThemeProvider>
    </BeaconAppSettingsContext.Provider>
  );
}

export function useBeaconAppSettings(): BeaconAppSettingsContextValue {
  const ctx = useContext(BeaconAppSettingsContext);
  if (!ctx) {
    throw new Error("useBeaconAppSettings must be used within BeaconAppSettingsProvider");
  }
  return ctx;
}
