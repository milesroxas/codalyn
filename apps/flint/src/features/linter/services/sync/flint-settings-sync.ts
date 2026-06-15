import { type FlintRuleConfig, parseFlintRuleConfig } from "@codalyn/webflow-kit";
import {
  createLocalStorageAdapter,
  DEFAULT_RULE_CONFIG_STORAGE_KEY,
} from "@/features/linter/services/storage/local-storage-adapter";
import { readFlintEntitlement, useFlintSyncStore } from "@/features/linter/services/sync/flint-sync.store";
import {
  fetchEffectiveFlintSettings,
  putFlintSettings,
} from "@/features/linter/services/sync/flint-tower-settings-client";
import { isPaidFlintTier } from "@/shared/lib/flint-entitlement";
import { isFlintTowerOriginConfigured } from "@/shared/lib/flint-tower-origin";

const ruleConfigStorage = createLocalStorageAdapter(DEFAULT_RULE_CONFIG_STORAGE_KEY);

/**
 * Whether Tower-backed mirroring should run: Tower must be configured AND the
 * resolved entitlement must be paid. The mirroring storage adapter consults this
 * on every write, so the free/offline path never touches the network.
 */
export function isFlintCloudSyncEnabled(): boolean {
  return isFlintTowerOriginConfigured() && isPaidFlintTier(readFlintEntitlement().tier);
}

/** Write a rule-config into local storage (offline source of truth) after a successful Tower exchange. */
export function writeRuleConfigToLocal(ruleConfig: FlintRuleConfig): void {
  ruleConfigStorage.write(JSON.stringify(ruleConfig));
}

/** Best-effort push of a serialized rule-config file to Tower (called by the mirroring adapter). */
export function pushRuleConfigToTower(serialized: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return;
  }
  void putFlintSettings({ ruleConfig: parseFlintRuleConfig(parsed) });
}

/** ISO-8601 timestamps sort lexicographically; missing counts as oldest. */
function isRemoteRuleConfigNewer(localRaw: string | null, remoteLastUpdated: string | undefined): boolean {
  const remote = remoteLastUpdated ?? "";
  let local = "";
  if (localRaw) {
    try {
      const o = JSON.parse(localRaw) as { lastUpdated?: unknown };
      local = typeof o.lastUpdated === "string" ? o.lastUpdated : "";
    } catch {
      local = "";
    }
  }
  return remote > local;
}

export type HydrateOptions = {
  /** Called after local storage is updated so the linter re-initializes with the new config. */
  onApplied?: () => void;
};

/**
 * Hydrate Flint config from Tower (paid tier). Local storage stays the source of
 * truth and offline cache; Tower is authoritative ONLY on hydrate, and only when
 * its copy is newer than the local one (last-write-wins). On any failure the
 * local config is left untouched, so the offline path is unaffected.
 */
export async function hydrateFlintFromTower(options: HydrateOptions = {}): Promise<void> {
  if (!isFlintTowerOriginConfigured()) {
    return;
  }
  const store = useFlintSyncStore.getState();
  store.setStatus("hydrating");

  const result = await fetchEffectiveFlintSettings();
  if (!result.ok) {
    if (result.error === "tower_unreachable") {
      store.setStatus("offline");
    } else {
      store.setError(result.error);
    }
    return;
  }

  store.setEffective(result.data);

  // Free tier: nothing to apply locally (server holds no paid config); offline path stands.
  if (!isPaidFlintTier(result.data.entitlement.tier)) {
    return;
  }

  const localRaw = ruleConfigStorage.read();
  const remote = result.data.ruleConfig;

  if (isRemoteRuleConfigNewer(localRaw, remote.lastUpdated)) {
    ruleConfigStorage.write(JSON.stringify(remote));
    options.onApplied?.();
  } else if (localRaw) {
    // Local is newer (offline edits before reconnect) — push it up; keep local as-is.
    pushRuleConfigToTower(localRaw);
  }
}
