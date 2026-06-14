import type { StorageAdapter } from "@/features/linter/services/storage/local-storage-adapter";

export type TowerMirroringOptions = {
  /** Gate: only mirror to Tower when this returns true (paid tier + Tower configured). */
  shouldMirror: () => boolean;
  /** Best-effort push to Tower. Must never throw; failures are swallowed by the caller. */
  push: (value: string) => void;
  /** Debounce window (ms) to coalesce rapid writes into one Tower push. */
  debounceMs?: number;
  /** Injectable timers for tests. */
  setTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
};

/**
 * Decorates a synchronous base adapter so that `read()` is always the local
 * source of truth (offline-safe) while `write()` writes locally first, then —
 * only when `shouldMirror()` is true — fires a debounced, best-effort push to
 * Tower. A failed or disabled push never affects the local write, so the free
 * tier and the offline path behave exactly like the bare local adapter.
 */
export function createTowerMirroringStorageAdapter(
  base: StorageAdapter,
  options: TowerMirroringOptions
): StorageAdapter {
  const debounceMs = options.debounceMs ?? 800;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle));

  let pending: ReturnType<typeof setTimeout> | null = null;
  let lastValue: string | null = null;

  const flush = () => {
    pending = null;
    if (lastValue === null) {
      return;
    }
    const value = lastValue;
    lastValue = null;
    if (!options.shouldMirror()) {
      return;
    }
    try {
      options.push(value);
    } catch {
      /* best-effort: local write already succeeded */
    }
  };

  return {
    read: () => base.read(),
    write: (value: string) => {
      base.write(value);
      if (!options.shouldMirror()) {
        return;
      }
      lastValue = value;
      if (pending !== null) {
        clearTimer(pending);
      }
      pending = setTimer(flush, debounceMs);
    },
  };
}
