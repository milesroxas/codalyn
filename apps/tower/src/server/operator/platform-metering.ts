import {
  getTowerLimitsSnapshot,
  sanitizeTowerLimitsPatch,
  saveTowerLimitsSnapshot,
  type TowerLimitsPatch,
  type TowerLimitsSnapshot,
} from "@/server/billing/tower-limits-config";
import type { OperatorPlatformMeteringConfig, OperatorPlatformMeteringPatch } from "@/server/operator/types";

function mapPlatformMeteringConfig(snapshot: TowerLimitsSnapshot): OperatorPlatformMeteringConfig {
  return {
    globalMeteringEnabled: snapshot.globalMeteringEnabled,
    envEmergencyMeteringDisabled: snapshot.envEmergencyMeteringDisabled,
    free: snapshot.free,
    pro: snapshot.pro,
    studio: snapshot.studio,
    team: snapshot.team,
    updatedAt: snapshot.updatedAt,
  };
}

export async function fetchOperatorPlatformMeteringConfig(): Promise<OperatorPlatformMeteringConfig> {
  return mapPlatformMeteringConfig(await getTowerLimitsSnapshot());
}

export function sanitizeOperatorPlatformMeteringPatch(raw: unknown): OperatorPlatformMeteringPatch | { error: string } {
  return sanitizeTowerLimitsPatch(raw);
}

export async function saveOperatorPlatformMeteringConfig(
  patch: OperatorPlatformMeteringPatch
): Promise<OperatorPlatformMeteringConfig> {
  const saved = await saveTowerLimitsSnapshot(patch as TowerLimitsPatch);
  return mapPlatformMeteringConfig(saved);
}
