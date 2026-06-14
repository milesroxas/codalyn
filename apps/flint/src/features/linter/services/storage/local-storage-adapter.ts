/**
 * Synchronous key/value storage seam used by the rule-configuration service and
 * the settings store. localStorage is the source of truth for the free tier and
 * the offline cache for paid tiers; Tower mirroring is layered on top via
 * `tower-mirroring-storage-adapter.ts` (it never replaces this synchronous read).
 */
export interface StorageAdapter {
  read(): string | null;
  write(value: string): void;
}

/** Default localStorage key for the serialized rule-configuration file. */
export const DEFAULT_RULE_CONFIG_STORAGE_KEY = "codalyn.linter.rules.v1";

export function createLocalStorageAdapter(key: string): StorageAdapter {
  return {
    read: () => {
      try {
        return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    },
    write: (value: string) => {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(key, value);
        }
      } catch {
        /* no-op in private browsing or blocked storage */
      }
    },
  };
}
