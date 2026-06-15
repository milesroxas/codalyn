import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { type FlintTowerUser, useFlintTowerSession } from "@/features/auth/model/use-flint-tower-session";
import { initializeRuleRegistry } from "@/features/linter/services/registry";
import { hydrateFlintFromTower, writeRuleConfigToLocal } from "@/features/linter/services/sync/flint-settings-sync";
import { type FlintSyncStatus, useFlintSyncStore } from "@/features/linter/services/sync/flint-sync.store";
import {
  type FlintEffectiveSettings,
  type FlintSettingsPutBody,
  putFlintSettings,
} from "@/features/linter/services/sync/flint-tower-settings-client";
import { type FlintEntitlement, getDefaultFlintEntitlement } from "@/shared/lib/flint-entitlement";
import { isFlintTowerOriginConfigured } from "@/shared/lib/flint-tower-origin";

export type FlintTowerContextValue = {
  isTowerConfigured: boolean;
  user: FlintTowerUser | undefined;
  sessionPending: boolean;
  signIn: () => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => void;
  entitlement: FlintEntitlement;
  syncStatus: FlintSyncStatus;
  effective: FlintEffectiveSettings | null;
  refresh: () => void;
  /** PUT a settings/rule-config/team patch; applies the returned effective payload locally on success. */
  updateSettings: (body: FlintSettingsPutBody) => Promise<{ ok: boolean; error?: string }>;
};

const FlintTowerContext = createContext<FlintTowerContextValue | null>(null);

/** Throttle visibility-triggered refetches to at most once per minute (mirrors Beacon). */
const VISIBILITY_REFRESH_MIN_INTERVAL_MS = 60_000;

export function FlintTowerProvider({ children }: { children: ReactNode }) {
  const { user, isPending: sessionPending, signInWithDesignerSession, signOut } = useFlintTowerSession();
  const effective = useFlintSyncStore((s) => s.effective);
  const syncStatus = useFlintSyncStore((s) => s.status);
  const isTowerConfigured = isFlintTowerOriginConfigured();
  const lastVisibilityRefreshAt = useRef(0);

  const refresh = useCallback(() => {
    if (!isTowerConfigured || !user) {
      return;
    }
    void hydrateFlintFromTower({ onApplied: () => initializeRuleRegistry() });
  }, [isTowerConfigured, user]);

  // Hydrate on sign-in / user change.
  useEffect(() => {
    if (!isTowerConfigured || !user) {
      return;
    }
    refresh();
  }, [isTowerConfigured, user, refresh]);

  // Refetch when the Designer tab regains focus (throttled), so team changes propagate.
  useEffect(() => {
    if (!isTowerConfigured || !user) {
      return;
    }
    const onResume = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      const now = Date.now();
      if (
        lastVisibilityRefreshAt.current > 0 &&
        now - lastVisibilityRefreshAt.current < VISIBILITY_REFRESH_MIN_INTERVAL_MS
      ) {
        return;
      }
      lastVisibilityRefreshAt.current = now;
      refresh();
    };
    document.addEventListener("visibilitychange", onResume);
    return () => document.removeEventListener("visibilitychange", onResume);
  }, [isTowerConfigured, user, refresh]);

  const updateSettings = useCallback(async (body: FlintSettingsPutBody): Promise<{ ok: boolean; error?: string }> => {
    const result = await putFlintSettings(body);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    useFlintSyncStore.getState().setEffective(result.data);
    // Keep the offline cache + running linter consistent with the synced result.
    writeRuleConfigToLocal(result.data.ruleConfig);
    initializeRuleRegistry();
    return { ok: true };
  }, []);

  const value = useMemo<FlintTowerContextValue>(
    () => ({
      isTowerConfigured,
      user,
      sessionPending,
      signIn: signInWithDesignerSession,
      signOut,
      entitlement: effective?.entitlement ?? getDefaultFlintEntitlement(),
      syncStatus,
      effective,
      refresh,
      updateSettings,
    }),
    [
      isTowerConfigured,
      user,
      sessionPending,
      signInWithDesignerSession,
      signOut,
      effective,
      syncStatus,
      refresh,
      updateSettings,
    ]
  );

  return <FlintTowerContext.Provider value={value}>{children}</FlintTowerContext.Provider>;
}

/** Access the Flint↔Tower context. Returns a safe offline default when no provider is mounted. */
export function useFlintTower(): FlintTowerContextValue {
  const ctx = useContext(FlintTowerContext);
  if (ctx) {
    return ctx;
  }
  return {
    isTowerConfigured: false,
    user: undefined,
    sessionPending: false,
    signIn: async () => ({ ok: false, error: "tower_not_configured" }),
    signOut: () => {},
    entitlement: getDefaultFlintEntitlement(),
    syncStatus: "idle",
    effective: null,
    refresh: () => {},
    updateSettings: async () => ({ ok: false, error: "tower_not_configured" }),
  };
}
