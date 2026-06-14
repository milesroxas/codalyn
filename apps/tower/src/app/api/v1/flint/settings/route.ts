import {
  FLINT_SETTINGS_ERROR_CODES,
  type FlintAppSettings,
  type FlintCustomPresets,
  type FlintRuleConfig,
  getDefaultFlintAppSettings,
  getDefaultFlintRuleConfig,
  getFlintSettingsTowerPutRejection,
  mergeFlintCustomPresets,
  mergeFlintOrgTeamSettingsIntoUser,
  mergeFlintRuleConfig,
  parseFlintAppSettings,
  parseFlintAppSettingsPartial,
  parseFlintCustomPresets,
  parseFlintOrgTeamSettingsPartial,
  parseFlintRuleConfig,
  selectFlintTeamCustomPresets,
  selectFlintTeamRuleConfig,
} from "@codalyn/webflow-kit";
import { eq } from "drizzle-orm";
import { resolveTowerEntitlement } from "@/server/billing/entitlements";
import {
  canManageFlintTeamSettings,
  computeFlintEditorExperience,
  type FlintMembershipContext,
  listFlintWorkspacesForUser,
  resolveFlintMembershipContext,
  resolveTargetOrganizationIdForFlintTeamSettings,
} from "@/server/flint-settings-context";
import { persistTeamFlintPatch, upsertUserFlintPayload } from "@/server/flint-settings-persist";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { db } from "@/shared/lib/db";
import { flintAppSettings as flintAppSettingsTable, organization } from "@/shared/lib/db/auth-schema";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

export const runtime = "nodejs";

function jsonError(status: number, error: string, errorCode?: string): Response {
  return Response.json(errorCode ? { error, errorCode } : { error }, { status });
}

type PutBody = {
  organizationId?: string;
  settings?: Partial<FlintAppSettings>;
  ruleConfig?: FlintRuleConfig | null;
  customPresets?: FlintCustomPresets | null;
  team?: Partial<ReturnType<typeof parseFlintOrgTeamSettingsPartial>>;
};

function extractBody(raw: unknown): {
  organizationId?: string;
  settingsPatch: Partial<FlintAppSettings>;
  ruleConfig?: FlintRuleConfig | null;
  customPresets?: FlintCustomPresets | null;
  teamPatch: ReturnType<typeof parseFlintOrgTeamSettingsPartial>;
  hasOrganizationIdOverride: boolean;
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { settingsPatch: {}, teamPatch: {}, hasOrganizationIdOverride: false };
  }
  const o = raw as Record<string, unknown>;
  const organizationId = typeof o.organizationId === "string" ? o.organizationId : undefined;
  const body = o as PutBody;
  return {
    organizationId,
    settingsPatch: parseFlintAppSettingsPartial(body.settings ?? {}),
    // Distinguish "absent" (undefined → keep existing) from "explicit null" (clear).
    ruleConfig:
      body.ruleConfig === undefined
        ? undefined
        : body.ruleConfig === null
          ? null
          : parseFlintRuleConfig(body.ruleConfig),
    customPresets:
      body.customPresets === undefined
        ? undefined
        : body.customPresets === null
          ? null
          : parseFlintCustomPresets(body.customPresets),
    teamPatch: parseFlintOrgTeamSettingsPartial(body.team ?? {}),
    hasOrganizationIdOverride: typeof o.organizationId === "string",
  };
}

async function loadEffectiveFlintSettings(userId: string, ctx: FlintMembershipContext) {
  const [rows, workspaces, entitlement] = await Promise.all([
    db.select().from(flintAppSettingsTable).where(eq(flintAppSettingsTable.userId, userId)).limit(1),
    listFlintWorkspacesForUser(userId),
    resolveTowerEntitlement(userId, ctx.activeOrganizationId),
  ]);

  const row = rows[0];
  const userSettings: FlintAppSettings = row?.payload
    ? parseFlintAppSettings(row.payload)
    : getDefaultFlintAppSettings();
  const userRuleConfig: FlintRuleConfig = row?.ruleConfig
    ? parseFlintRuleConfig(row.ruleConfig)
    : getDefaultFlintRuleConfig();
  const userCustomPresets: FlintCustomPresets = row?.customPresets ? parseFlintCustomPresets(row.customPresets) : [];

  const team = ctx.flintTeamSettings ?? null;
  const settings = mergeFlintOrgTeamSettingsIntoUser(userSettings, team);
  const ruleConfig = mergeFlintRuleConfig(userRuleConfig, selectFlintTeamRuleConfig(team));
  const customPresets = mergeFlintCustomPresets(userCustomPresets, selectFlintTeamCustomPresets(team));

  const editorExperience = computeFlintEditorExperience(ctx);
  const canManageTeam = canManageFlintTeamSettings(ctx);
  const restrictToEditorExperience = isTowerTeamAdminRole(ctx.memberRole) ? ctx.flintRestrictToEditorExperience : false;

  const activeId = ctx.activeOrganizationId;
  let activeOrganizationName = activeId ? (workspaces.find((w) => w.id === activeId)?.name ?? null) : null;
  if (activeId && activeOrganizationName === null) {
    const o = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, activeId))
      .limit(1);
    activeOrganizationName = o[0]?.name ?? null;
  }

  return {
    settings,
    ruleConfig,
    customPresets,
    entitlement,
    editorExperience,
    canManageTeamFlintSettings: canManageTeam,
    restrictToEditorExperience,
    workspaceMemberRole: ctx.memberRole,
    appUserRole: ctx.appUserRole,
    hasActiveWorkspace: Boolean(activeId),
    activeOrganizationId: activeId,
    activeOrganizationName,
    workspaces,
  };
}

export async function GET(req: Request) {
  try {
    const auth = await verifyTowerApiRequest(req);
    if (!auth.ok) {
      return auth.response;
    }
    if (!auth.userId) {
      return jsonError(401, "Session required");
    }

    const ctx = await resolveFlintMembershipContext(req);
    if (!ctx) {
      return jsonError(401, "Session required");
    }

    const payload = await loadEffectiveFlintSettings(auth.userId, ctx);
    return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError(500, "Could not load Flint settings");
  }
}

/** Maps a team-mutation policy rejection to its HTTP response, or null when permitted. */
function teamMutationRejectionResponse(
  rejection: ReturnType<typeof getFlintSettingsTowerPutRejection>
): Response | null {
  if (rejection === FLINT_SETTINGS_ERROR_CODES.TEAM_CONFIG_LOCKED_EDITOR_MODE) {
    return jsonError(403, "Team config is locked in editor mode", rejection);
  }
  if (rejection === FLINT_SETTINGS_ERROR_CODES.TEAM_CONFIG_PERMISSION_DENIED) {
    return jsonError(403, "Team config mutation denied", rejection);
  }
  return null;
}

/** Editor-experience members may only persist personal theme; everyone else persists the full patch. */
function pickPersonalSettings(
  editorExperience: boolean,
  settingsPatch: Partial<FlintAppSettings>
): Partial<FlintAppSettings> {
  if (!editorExperience) {
    return settingsPatch;
  }
  return settingsPatch.theme !== undefined ? { theme: settingsPatch.theme } : {};
}

/** Persists the parsed body for an authorized, paid user. Returns a Response only on a validation error. */
async function applyFlintPut(
  userId: string,
  ctx: FlintMembershipContext,
  body: ReturnType<typeof extractBody>
): Promise<Response | null> {
  const { organizationId, settingsPatch, ruleConfig, customPresets, teamPatch, hasOrganizationIdOverride } = body;

  if (hasOrganizationIdOverride && !isProductAdminAppRole(ctx.appUserRole)) {
    return jsonError(400, "organizationId is only valid for product admins");
  }

  const editorExperience = computeFlintEditorExperience(ctx);
  const canManageTeam = canManageFlintTeamSettings(ctx);

  const rejectionResponse = teamMutationRejectionResponse(
    getFlintSettingsTowerPutRejection(teamPatch, { editorExperience, canManageTeamFlintSettings: canManageTeam })
  );
  if (rejectionResponse) {
    return rejectionResponse;
  }

  const hasTeamMutation = Object.keys(teamPatch).length > 0;
  const targetOrgId = await resolveTargetOrganizationIdForFlintTeamSettings(ctx, organizationId);
  if (hasTeamMutation && !targetOrgId) {
    return jsonError(400, "Organization context required", FLINT_SETTINGS_ERROR_CODES.ORGANIZATION_CONTEXT_REQUIRED);
  }
  if (organizationId?.trim() && isProductAdminAppRole(ctx.appUserRole) && !targetOrgId) {
    return jsonError(400, "Unknown organization");
  }

  const personalSettingsToApply = pickPersonalSettings(editorExperience, settingsPatch);
  const hasPersonalMutation =
    Object.keys(personalSettingsToApply).length > 0 || ruleConfig !== undefined || customPresets !== undefined;

  if (hasPersonalMutation) {
    await upsertUserFlintPayload(userId, {
      settingsPatch: personalSettingsToApply,
      ruleConfig: editorExperience ? undefined : ruleConfig,
      customPresets: editorExperience ? undefined : customPresets,
    });
  }
  if (hasTeamMutation) {
    await persistTeamFlintPatch({ teamPatch, canManageTeam, targetOrgId });
  }
  return null;
}

async function putFlintSettings(req: Request): Promise<Response> {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.userId) {
    return jsonError(401, "Session required");
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON");
  }

  const ctx = await resolveFlintMembershipContext(req);
  if (!ctx) {
    return jsonError(401, "Session required");
  }

  // Tower-backed sync is a paid feature; free tier persists nothing server-side.
  const entitlement = await resolveTowerEntitlement(auth.userId, ctx.activeOrganizationId);
  if (entitlement.tier === "free") {
    return jsonError(402, "Cloud sync requires a paid plan", FLINT_SETTINGS_ERROR_CODES.ENTITLEMENT_REQUIRED);
  }

  const error = await applyFlintPut(auth.userId, ctx, extractBody(rawBody));
  if (error) {
    return error;
  }

  const nextCtx = await resolveFlintMembershipContext(req);
  if (!nextCtx) {
    return jsonError(401, "Session required");
  }
  const payload = await loadEffectiveFlintSettings(auth.userId, nextCtx);
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  try {
    return await putFlintSettings(req);
  } catch {
    return jsonError(500, "Could not save Flint settings");
  }
}
