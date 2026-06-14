import { create } from "zustand";
import type { FlintEffectiveSettings } from "@/features/linter/services/sync/flint-tower-settings-client";
import { getDefaultFlintEntitlement } from "@/shared/lib/flint-entitlement";

export type FlintSyncStatus = "idle" | "hydrating" | "synced" | "offline" | "error";

interface FlintSyncState {
  status: FlintSyncStatus;
  /** Latest effective payload from Tower (null until a successful hydrate). */
  effective: FlintEffectiveSettings | null;
  /** Last error code from a sync attempt, if any. */
  lastError: string | null;
}

interface FlintSyncActions {
  setStatus: (status: FlintSyncStatus) => void;
  setEffective: (effective: FlintEffectiveSettings) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initialState: FlintSyncState = {
  status: "idle",
  effective: null,
  lastError: null,
};

export const useFlintSyncStore = create<FlintSyncState & FlintSyncActions>()((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setEffective: (effective) => set({ effective, status: "synced", lastError: null }),
  setError: (lastError) => set({ lastError, status: "error" }),
  reset: () => set(initialState),
}));

/** Current entitlement (defaults to free/offline until a hydrate succeeds). */
export function readFlintEntitlement() {
  return useFlintSyncStore.getState().effective?.entitlement ?? getDefaultFlintEntitlement();
}
