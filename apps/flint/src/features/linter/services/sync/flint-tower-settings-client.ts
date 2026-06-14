import {
  type FlintAppSettings,
  type FlintCustomPresets,
  type FlintOrgTeamSettings,
  type FlintRuleConfig,
  getDefaultFlintAppSettings,
  getDefaultFlintRuleConfig,
  parseFlintAppSettings,
  parseFlintCustomPresets,
  parseFlintRuleConfig,
} from "@codalyn/webflow-kit";
import { type FlintEntitlement, normalizeFlintEntitlement } from "@/shared/lib/flint-entitlement";
import { towerFetch } from "@/shared/lib/tower-client";
import { formatTowerReachabilityError } from "@/shared/lib/tower-reachability-error";

const SETTINGS_PATH = "/api/v1/flint/settings";

/** Normalized effective settings returned by Tower (personal ⊕ team override). */
export type FlintEffectiveSettings = {
  settings: FlintAppSettings;
  ruleConfig: FlintRuleConfig;
  customPresets: FlintCustomPresets;
  entitlement: FlintEntitlement;
  editorExperience: boolean;
  canManageTeamFlintSettings: boolean;
  hasActiveWorkspace: boolean;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
};

export type FlintSettingsFetchResult = { ok: true; data: FlintEffectiveSettings } | { ok: false; error: string };

/** Boundary normalizer: treat the Tower payload as a runtime union, default every field safely. */
function normalizeEffectiveSettings(raw: unknown): FlintEffectiveSettings {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    settings: o.settings ? parseFlintAppSettings(o.settings) : getDefaultFlintAppSettings(),
    ruleConfig: o.ruleConfig ? parseFlintRuleConfig(o.ruleConfig) : getDefaultFlintRuleConfig(),
    customPresets: parseFlintCustomPresets(o.customPresets),
    entitlement: normalizeFlintEntitlement(o.entitlement),
    editorExperience: o.editorExperience === true,
    canManageTeamFlintSettings: o.canManageTeamFlintSettings === true,
    hasActiveWorkspace: o.hasActiveWorkspace === true,
    activeOrganizationId: typeof o.activeOrganizationId === "string" ? o.activeOrganizationId : null,
    activeOrganizationName: typeof o.activeOrganizationName === "string" ? o.activeOrganizationName : null,
  };
}

/** GET effective Flint settings + entitlement from Tower. */
export async function fetchEffectiveFlintSettings(): Promise<FlintSettingsFetchResult> {
  let res: Response;
  try {
    res = await towerFetch(SETTINGS_PATH, { method: "GET" });
  } catch (error) {
    console.warn(`[flint/sync] ${formatTowerReachabilityError(error)}`);
    return { ok: false, error: "tower_unreachable" };
  }
  if (!res.ok) {
    return { ok: false, error: `http_${res.status}` };
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  return { ok: true, data: normalizeEffectiveSettings(json) };
}

export type FlintSettingsPutBody = {
  organizationId?: string;
  settings?: Partial<FlintAppSettings>;
  ruleConfig?: FlintRuleConfig | null;
  customPresets?: FlintCustomPresets | null;
  team?: Partial<FlintOrgTeamSettings>;
};

/** PUT a Flint settings patch to Tower; returns the fresh effective payload on success. */
export async function putFlintSettings(body: FlintSettingsPutBody): Promise<FlintSettingsFetchResult> {
  let res: Response;
  try {
    res = await towerFetch(SETTINGS_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.warn(`[flint/sync] ${formatTowerReachabilityError(error)}`);
    return { ok: false, error: "tower_unreachable" };
  }
  if (!res.ok) {
    return { ok: false, error: `http_${res.status}` };
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  return { ok: true, data: normalizeEffectiveSettings(json) };
}
