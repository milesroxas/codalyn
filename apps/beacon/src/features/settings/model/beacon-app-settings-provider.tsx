import {
  BEACON_IMAGE_ERROR_CODES,
  type BeaconAppSettings,
  canPersistBeaconTeamExportDefaults,
  getBeaconSettingsTowerPutRejection,
  getDefaultBeaconAppSettings,
  mergeBeaconAppSettings,
  parseBeaconAppSettings,
  type WebflowSiteSummary,
} from "@codalyn/webflow-kit";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import {
  type BeaconSettingsSyncState,
  isBeaconTowerSettingsPullPending,
  isBeaconTowerSettingsPullSettled,
  isBeaconTowerSettingsSynced,
} from "@/features/settings/lib/beacon-settings-sync";
import { towerFetch } from "@/shared/lib/tower-client";
import { ThemeProvider } from "@/shared/providers/theme-provider";

const STORAGE_KEY = "beacon:app-settings-v1";

export type { BeaconSettingsSyncState } from "@/features/settings/lib/beacon-settings-sync";

export type BeaconTowerWorkspace = { id: string; name: string };

export type BeaconAppSettingsPatch =
  | Partial<BeaconAppSettings>
  | ((prev: BeaconAppSettings) => Partial<BeaconAppSettings>);

export type BeaconSettingsUpdateResult = { ok: true } | { ok: false; error: string };

type BeaconAppSettingsContextValue = {
  settings: BeaconAppSettings;
  updateSettings: (patch: BeaconAppSettingsPatch) => Promise<BeaconSettingsUpdateResult>;
  syncState: BeaconSettingsSyncState;
  /** Re-fetch settings from Tower (no-op when signed out). */
  refreshBeaconSettings: () => void;
  /** True when signed in to Tower (session may still be resolving). */
  isTowerUser: boolean;
  /**
   * Webflow sites in the workspace's Data API OAuth grant (authorized sites). `null` until a Tower pull
   * has resolved them (or when Webflow isn't connected). Used to gate features on the current site.
   */
  webflowSites: WebflowSiteSummary[] | null;
  /** Persist export defaults from the image editor after Tower sync (or always for guests). */
  canPersistExportDefaults: boolean;
  /** Signed-in Tower user and initial settings pull still in flight. */
  settingsPullPending: boolean;
  /** Tower settings pull succeeded; workspace role flags are authoritative. */
  settingsPullSynced: boolean;
  /** Tower settings pull finished (synced or failed); UI may use local settings. */
  settingsPullSettled: boolean;
  /** Team editors + team admins who opt in: limited UI; uses designer team presets. */
  editorExperience: boolean;
  /** Designers and product admins may edit workspace team presets (stored on the organization). */
  canManageTeamBeaconSettings: boolean;
  /** Team admins only: self-switch for editor-style Beacon (default off). */
  restrictToEditorExperience: boolean;
  /** Active Tower workspace membership role (`member.role`), when synced. */
  workspaceMemberRole: string | null;
  /** Better Auth `user.role` (e.g. product admin), when synced. */
  appUserRole: string | null;
  /** Whether the session has an active organization (workspace) selected. */
  hasActiveWorkspace: boolean;
  /** Workspaces the user belongs to (from Tower), when synced. */
  beaconWorkspaces: BeaconTowerWorkspace[];
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  /** Switch active Tower workspace (session); refetches settings on success. */
  setActiveBeaconWorkspace: (organizationId: string) => void;
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
  return getDefaultBeaconAppSettings();
}

function writeLocal(settings: BeaconAppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

type TowerBeaconApiEnvelope = {
  settings?: BeaconAppSettings;
  editorExperience?: boolean;
  canManageTeamBeaconSettings?: boolean;
  restrictToEditorExperience?: boolean;
  workspaceMemberRole?: string | null;
  appUserRole?: string | null;
  hasActiveWorkspace?: boolean;
  workspaces?: BeaconTowerWorkspace[];
  activeOrganizationId?: string | null;
  activeOrganizationName?: string | null;
  webflowSites?: WebflowSiteSummary[] | null;
};

function applyTowerBeaconEnvelope(
  data: TowerBeaconApiEnvelope,
  setters: {
    setSettings: (s: BeaconAppSettings) => void;
    setEditorExperience: (v: boolean) => void;
    setCanManageTeamBeaconSettings: (v: boolean) => void;
    setRestrictToEditorExperience: (v: boolean) => void;
    setWorkspaceMemberRole: (v: string | null) => void;
    setAppUserRole: (v: string | null) => void;
    setHasActiveWorkspace: (v: boolean) => void;
    setBeaconWorkspaces: (v: BeaconTowerWorkspace[]) => void;
    setActiveOrganizationId: (v: string | null) => void;
    setActiveOrganizationName: (v: string | null) => void;
    setWebflowSites?: (v: WebflowSiteSummary[] | null) => void;
  }
) {
  if (data.settings) {
    const parsed = parseBeaconAppSettings(data.settings);
    setters.setSettings(parsed);
    writeLocal(parsed);
  }
  if (data.editorExperience !== undefined) {
    setters.setEditorExperience(Boolean(data.editorExperience));
  }
  if (data.canManageTeamBeaconSettings !== undefined) {
    setters.setCanManageTeamBeaconSettings(Boolean(data.canManageTeamBeaconSettings));
  }
  if (data.restrictToEditorExperience !== undefined) {
    setters.setRestrictToEditorExperience(Boolean(data.restrictToEditorExperience));
  }
  if (data.workspaceMemberRole !== undefined) {
    setters.setWorkspaceMemberRole(data.workspaceMemberRole);
  }
  if (data.appUserRole !== undefined) {
    setters.setAppUserRole(data.appUserRole);
  }
  if (data.workspaces !== undefined) {
    setters.setBeaconWorkspaces(data.workspaces);
  }
  if (data.activeOrganizationId !== undefined) {
    setters.setActiveOrganizationId(data.activeOrganizationId);
  }
  if (data.activeOrganizationName !== undefined) {
    setters.setActiveOrganizationName(data.activeOrganizationName);
  }
  if (data.activeOrganizationId !== undefined) {
    setters.setHasActiveWorkspace(Boolean(data.activeOrganizationId));
  } else if (data.hasActiveWorkspace !== undefined) {
    setters.setHasActiveWorkspace(Boolean(data.hasActiveWorkspace));
  }
  if (data.webflowSites !== undefined) {
    setters.setWebflowSites?.(data.webflowSites ?? null);
  }
}

function isEmptySettingsPatch(patch: Partial<BeaconAppSettings>): boolean {
  return Object.keys(patch).length === 0;
}

function mergePendingTowerPatches(patches: ReadonlyArray<Partial<BeaconAppSettings>>): Partial<BeaconAppSettings> {
  if (patches.length === 0) {
    return {};
  }
  let merged = getDefaultBeaconAppSettings();
  const keys = new Set<keyof BeaconAppSettings>();
  for (const patch of patches) {
    for (const key of Object.keys(patch) as (keyof BeaconAppSettings)[]) {
      if (patch[key] !== undefined) {
        keys.add(key);
      }
    }
    merged = mergeBeaconAppSettings(merged, patch);
  }
  return Object.fromEntries([...keys].map((key) => [key, merged[key]])) as Partial<BeaconAppSettings>;
}

function rollbackOptimisticSettings(previous: BeaconAppSettings, setSettings: (s: BeaconAppSettings) => void) {
  setSettings(previous);
  writeLocal(previous);
}

function beaconSettingsTowerPutRejectionMessage(
  rejection: NonNullable<ReturnType<typeof getBeaconSettingsTowerPutRejection>>
): string {
  if (rejection === BEACON_IMAGE_ERROR_CODES.TEAM_PRESETS_LOCKED_EDITOR_MODE) {
    return "Team presets are locked in editor mode.";
  }
  return "Preset mutation denied.";
}

async function persistSettingsPatchToTower(args: {
  resolved: Partial<BeaconAppSettings>;
  previous: BeaconAppSettings;
  generation: number;
  putGenerationRef: { current: number };
  setters: Parameters<typeof applyTowerBeaconEnvelope>[1];
  setSyncState: (state: BeaconSettingsSyncState) => void;
}): Promise<BeaconSettingsUpdateResult> {
  const { resolved, previous, generation, putGenerationRef, setters, setSyncState } = args;

  try {
    const response = await towerFetch("/api/v1/beacon/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resolved),
    });

    if (generation !== putGenerationRef.current) {
      return { ok: true };
    }

    if (!response.ok) {
      rollbackOptimisticSettings(previous, setters.setSettings);
      return { ok: false, error: `Could not sync settings (${response.status})` };
    }

    const data = (await response.json()) as TowerBeaconApiEnvelope;
    applyTowerBeaconEnvelope(data, setters);
    setSyncState("synced");
    return { ok: true };
  } catch {
    if (generation !== putGenerationRef.current) {
      return { ok: true };
    }
    rollbackOptimisticSettings(previous, setters.setSettings);
    return { ok: false, error: "Could not sync settings" };
  }
}

export function BeaconAppSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useBeaconTowerSession();
  const [settings, setSettings] = useState<BeaconAppSettings>(() => readLocal());
  const [syncState, setSyncState] = useState<BeaconSettingsSyncState>("idle");
  const [editorExperience, setEditorExperience] = useState(false);
  const [canManageTeamBeaconSettings, setCanManageTeamBeaconSettings] = useState(false);
  const [restrictToEditorExperience, setRestrictToEditorExperience] = useState(false);
  const [workspaceMemberRole, setWorkspaceMemberRole] = useState<string | null>(null);
  const [appUserRole, setAppUserRole] = useState<string | null>(null);
  const [hasActiveWorkspace, setHasActiveWorkspace] = useState(false);
  const [beaconWorkspaces, setBeaconWorkspaces] = useState<BeaconTowerWorkspace[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [activeOrganizationName, setActiveOrganizationName] = useState<string | null>(null);
  const [webflowSites, setWebflowSites] = useState<WebflowSiteSummary[] | null>(null);

  const isTowerUser = Boolean(user?.id);

  const towerPutPolicy = useMemo(
    () => ({
      editorExperience,
      canManageTeamBeaconSettings,
    }),
    [editorExperience, canManageTeamBeaconSettings]
  );

  const settingsPullPending = isBeaconTowerSettingsPullPending(isTowerUser, syncState);
  const settingsPullSynced = isBeaconTowerSettingsSynced(isTowerUser, syncState);
  const settingsPullSettled = isBeaconTowerSettingsPullSettled(isTowerUser, syncState);

  const canPersistExportDefaults =
    !isTowerUser || (settingsPullSynced && canPersistBeaconTeamExportDefaults(towerPutPolicy));

  const abortRef = useRef<AbortController | null>(null);
  /** Throttle refetch on tab focus to avoid bursty duplicate Tower load. */
  const lastVisibilityPullAtRef = useRef(0);
  /** Ignore stale Tower PUT responses when a newer update is in flight. */
  const putGenerationRef = useRef(0);
  /** Patches saved before Tower settings pull completes; flushed once syncState is synced. */
  const pendingTowerPatchesRef = useRef<Partial<BeaconAppSettings>[]>([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  /** Latest syncState for closures (catch handler) without re-creating the pull callback on every change. */
  const syncStateRef = useRef(syncState);
  syncStateRef.current = syncState;

  const pullSettingsFromTower = useCallback(
    (options?: { background?: boolean }) => {
      if (!user?.id) {
        return;
      }
      const background = options?.background === true;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      // Background refresh (tab focus / visibilitychange) must NOT flip to "loading": that makes
      // `settingsPullPending` true, which unmounts the working route subtree (BeaconSiteLinkGuard /
      // CmsSlotsAccessGate) and wipes unsaved in-screen state. Refresh silently, commit only on success.
      if (!background) {
        setSyncState("loading");
      }

      void towerFetch("/api/v1/beacon/settings", { signal: ac.signal })
        .then(async (r) => {
          if (!r.ok) {
            throw new Error(`settings ${r.status}`);
          }
          return r.json() as Promise<TowerBeaconApiEnvelope & { settings: BeaconAppSettings }>;
        })
        .then((data) => {
          applyTowerBeaconEnvelope(data, {
            setSettings,
            setEditorExperience,
            setCanManageTeamBeaconSettings,
            setRestrictToEditorExperience,
            setWorkspaceMemberRole,
            setAppUserRole,
            setHasActiveWorkspace,
            setBeaconWorkspaces,
            setActiveOrganizationId,
            setActiveOrganizationName,
            setWebflowSites,
          });
          setSyncState("synced");
          lastVisibilityPullAtRef.current = Date.now();
        })
        .catch(() => {
          if (ac.signal.aborted) {
            return;
          }
          // A failed background refresh must not tear down a working session: keep the last-good synced
          // state instead of surfacing "error" (which the access gate renders as a full-screen retry).
          if (background && syncStateRef.current === "synced") {
            return;
          }
          setSyncState("error");
        });
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user?.id) {
      abortRef.current?.abort();
      lastVisibilityPullAtRef.current = 0;
      pendingTowerPatchesRef.current = [];
      setSettings(readLocal());
      setSyncState("idle");
      setEditorExperience(false);
      setCanManageTeamBeaconSettings(false);
      setRestrictToEditorExperience(false);
      setWorkspaceMemberRole(null);
      setAppUserRole(null);
      setHasActiveWorkspace(false);
      setBeaconWorkspaces([]);
      setActiveOrganizationId(null);
      setActiveOrganizationName(null);
      setWebflowSites(null);
      return;
    }

    pullSettingsFromTower();
    return () => {
      abortRef.current?.abort();
    };
  }, [user?.id, pullSettingsFromTower]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const minIntervalMs = 60_000;
    const onResume = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      const now = Date.now();
      const last = lastVisibilityPullAtRef.current;
      if (last > 0 && now - last < minIntervalMs) {
        return;
      }
      pullSettingsFromTower({ background: true });
    };
    document.addEventListener("visibilitychange", onResume);
    return () => {
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [user?.id, pullSettingsFromTower]);

  const updateSettings = useCallback(
    async (patch: BeaconAppSettingsPatch): Promise<BeaconSettingsUpdateResult> => {
      let resolved: Partial<BeaconAppSettings> | undefined;
      let previous: BeaconAppSettings | undefined;
      let isNoOp = false;

      setSettings((prev) => {
        previous = prev;
        const toMerge = typeof patch === "function" ? patch(prev) : patch;
        resolved = toMerge;
        if (isEmptySettingsPatch(toMerge)) {
          isNoOp = true;
          return prev;
        }
        return mergeBeaconAppSettings(prev, toMerge);
      });

      if (!isNoOp && previous !== undefined && resolved !== undefined && !isEmptySettingsPatch(resolved)) {
        writeLocal(mergeBeaconAppSettings(previous, resolved));
      }

      if (isNoOp || resolved === undefined || isEmptySettingsPatch(resolved)) {
        return { ok: true };
      }

      if (!user?.id || previous === undefined) {
        return { ok: true };
      }

      const rejection = getBeaconSettingsTowerPutRejection(resolved, towerPutPolicy);
      if (rejection !== null) {
        rollbackOptimisticSettings(previous, setSettings);
        return { ok: false, error: beaconSettingsTowerPutRejectionMessage(rejection) };
      }

      if (syncState !== "synced") {
        pendingTowerPatchesRef.current.push(resolved);
        return { ok: true };
      }

      const generation = ++putGenerationRef.current;

      return persistSettingsPatchToTower({
        resolved,
        previous,
        generation,
        putGenerationRef,
        setSyncState,
        setters: {
          setSettings,
          setEditorExperience,
          setCanManageTeamBeaconSettings,
          setRestrictToEditorExperience,
          setWorkspaceMemberRole,
          setAppUserRole,
          setHasActiveWorkspace,
          setBeaconWorkspaces,
          setActiveOrganizationId,
          setActiveOrganizationName,
        },
      });
    },
    [user?.id, syncState, towerPutPolicy]
  );

  const setActiveBeaconWorkspace = useCallback(
    (organizationId: string) => {
      if (!user?.id || !organizationId.trim()) {
        return;
      }
      void towerFetch("/api/v1/beacon/active-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: organizationId.trim() }),
      }).then((r) => {
        if (r.ok) {
          pullSettingsFromTower();
        }
      });
    },
    [user?.id, pullSettingsFromTower]
  );

  useEffect(() => {
    if (syncState !== "synced" || !user?.id || pendingTowerPatchesRef.current.length === 0) {
      return;
    }
    const queued = pendingTowerPatchesRef.current;
    pendingTowerPatchesRef.current = [];
    const resolved = mergePendingTowerPatches(queued);
    if (isEmptySettingsPatch(resolved)) {
      return;
    }
    const rejection = getBeaconSettingsTowerPutRejection(resolved, towerPutPolicy);
    if (rejection !== null) {
      return;
    }
    const previous = settingsRef.current;
    const generation = ++putGenerationRef.current;
    void persistSettingsPatchToTower({
      resolved,
      previous,
      generation,
      putGenerationRef,
      setSyncState,
      setters: {
        setSettings,
        setEditorExperience,
        setCanManageTeamBeaconSettings,
        setRestrictToEditorExperience,
        setWorkspaceMemberRole,
        setAppUserRole,
        setHasActiveWorkspace,
        setBeaconWorkspaces,
        setActiveOrganizationId,
        setActiveOrganizationName,
      },
    });
  }, [syncState, user?.id, towerPutPolicy]);

  useEffect(() => {
    if (syncState !== "synced" || !user?.id || activeOrganizationId || beaconWorkspaces.length !== 1) {
      return;
    }
    const onlyWorkspaceId = beaconWorkspaces[0]?.id;
    if (onlyWorkspaceId) {
      setActiveBeaconWorkspace(onlyWorkspaceId);
    }
  }, [syncState, user?.id, activeOrganizationId, beaconWorkspaces, setActiveBeaconWorkspace]);

  const handleThemeChange = useCallback(
    (theme: BeaconAppSettings["theme"]) => {
      updateSettings({ theme });
    },
    [updateSettings]
  );

  const refreshBeaconSettings = useCallback(() => {
    pullSettingsFromTower();
  }, [pullSettingsFromTower]);

  const value = useMemo(
    (): BeaconAppSettingsContextValue => ({
      settings,
      updateSettings,
      syncState,
      refreshBeaconSettings,
      isTowerUser,
      webflowSites,
      canPersistExportDefaults,
      settingsPullPending,
      settingsPullSynced,
      settingsPullSettled,
      editorExperience,
      canManageTeamBeaconSettings,
      restrictToEditorExperience,
      workspaceMemberRole,
      appUserRole,
      hasActiveWorkspace,
      beaconWorkspaces,
      activeOrganizationId,
      activeOrganizationName,
      setActiveBeaconWorkspace,
    }),
    [
      settings,
      updateSettings,
      syncState,
      refreshBeaconSettings,
      isTowerUser,
      webflowSites,
      canPersistExportDefaults,
      settingsPullPending,
      settingsPullSynced,
      settingsPullSettled,
      editorExperience,
      canManageTeamBeaconSettings,
      restrictToEditorExperience,
      workspaceMemberRole,
      appUserRole,
      hasActiveWorkspace,
      beaconWorkspaces,
      activeOrganizationId,
      activeOrganizationName,
      setActiveBeaconWorkspace,
    ]
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
