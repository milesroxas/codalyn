import { useEffect } from "react";
import { useFlintTowerSession } from "@/features/auth/model/use-flint-tower-session";
import { initializeRuleRegistry } from "@/features/linter/services/registry";
import { hydrateFlintFromTower } from "@/features/linter/services/sync/flint-settings-sync";
import { type FlintSyncStatus, useFlintSyncStore } from "@/features/linter/services/sync/flint-sync.store";
import { type FlintEntitlement, getDefaultFlintEntitlement } from "@/shared/lib/flint-entitlement";
import { isFlintTowerOriginConfigured } from "@/shared/lib/flint-tower-origin";

/**
 * Resolves the Tower entitlement for the current user and hydrates synced config.
 * Defaults to free/offline until a Tower session resolves AND a hydrate succeeds,
 * so feature gating fails safe. Re-initializes the linter when synced config is
 * applied so the UI reflects the cloud copy.
 */
export function useFlintEntitlement(): {
  entitlement: FlintEntitlement;
  status: FlintSyncStatus;
  isTowerConfigured: boolean;
} {
  const { user } = useFlintTowerSession();
  const effective = useFlintSyncStore((s) => s.effective);
  const status = useFlintSyncStore((s) => s.status);
  const towerConfigured = isFlintTowerOriginConfigured();

  useEffect(() => {
    if (!towerConfigured || !user) {
      return;
    }
    void hydrateFlintFromTower({
      onApplied: () => {
        // Re-init with the freshly synced rule-config so the running linter reflects it.
        initializeRuleRegistry();
      },
    });
  }, [towerConfigured, user]);

  return {
    entitlement: effective?.entitlement ?? getDefaultFlintEntitlement(),
    status,
    isTowerConfigured: towerConfigured,
  };
}
