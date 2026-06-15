import { useFlintTower } from "@/features/auth/model/flint-tower-provider";
import type { FlintSyncStatus } from "@/features/linter/services/sync/flint-sync.store";
import type { FlintEntitlement } from "@/shared/lib/flint-entitlement";

/**
 * Thin selector over {@link useFlintTower} for components that only need the
 * resolved entitlement + sync status. Hydration is owned by `FlintTowerProvider`;
 * defaults to free/offline when no provider is mounted (free tier never sees Tower).
 */
export function useFlintEntitlement(): {
  entitlement: FlintEntitlement;
  status: FlintSyncStatus;
  isTowerConfigured: boolean;
} {
  const { entitlement, syncStatus, isTowerConfigured } = useFlintTower();
  return { entitlement, status: syncStatus, isTowerConfigured };
}
