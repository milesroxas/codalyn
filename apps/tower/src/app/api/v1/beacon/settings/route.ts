import {
  type BeaconAppSettings,
  getDefaultBeaconAppSettings,
  mergeBeaconAppSettings,
  mergeOrgTeamSettingsIntoUser,
  parseBeaconAppSettings,
  parseBeaconAppSettingsPartial,
  parseBeaconOrgTeamSettingsPartial,
  splitBeaconSettingsPatch,
} from "@codalyn/webflow-kit";
import { eq } from "drizzle-orm";
import {
  canManageBeaconTeamSettings,
  computeBeaconEditorExperience,
  listBeaconWorkspacesForUser,
  resolveBeaconMembershipContext,
  resolveTargetOrganizationIdForTeamSettings,
} from "@/server/beacon-settings-context";
import { persistTeamBeaconPatch, upsertUserBeaconPayload } from "@/server/beacon-settings-persist";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";
import { db } from "@/shared/lib/db";
import { beaconAppSettings as beaconAppSettingsTable, organization } from "@/shared/lib/db/auth-schema";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

export const runtime = "nodejs";

function stripPersonalForEditor(patch: Partial<BeaconAppSettings>): Partial<BeaconAppSettings> {
  const out: Partial<BeaconAppSettings> = {};
  if (patch.theme !== undefined) {
    out.theme = patch.theme;
  }
  return out;
}

function extractBody(raw: unknown): { organizationId?: string; patch: Partial<BeaconAppSettings> } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { patch: {} };
  }
  const o = raw as Record<string, unknown>;
  const organizationId = typeof o.organizationId === "string" ? o.organizationId : undefined;
  const { organizationId: _drop, ...rest } = o;
  void _drop;
  const patch = parseBeaconAppSettingsPartial(rest);
  return { organizationId, patch };
}

async function loadEffectiveSettings(userId: string, ctx: Awaited<ReturnType<typeof resolveBeaconMembershipContext>>) {
  const [rows, workspaces] = await Promise.all([
    db.select().from(beaconAppSettingsTable).where(eq(beaconAppSettingsTable.userId, userId)).limit(1),
    listBeaconWorkspacesForUser(userId),
  ]);

  const row = rows[0];
  const userSettings: BeaconAppSettings = row?.payload
    ? parseBeaconAppSettings(row.payload)
    : getDefaultBeaconAppSettings();

  const team = ctx?.beaconTeamSettings ?? null;
  const merged = mergeOrgTeamSettingsIntoUser(userSettings, team);
  const editorExperience = ctx ? computeBeaconEditorExperience(ctx) : false;
  const settings = editorExperience ? mergeBeaconAppSettings(merged, { designerOnlyImagePresets: [] }) : merged;
  const canManageTeamBeaconSettings = ctx ? canManageBeaconTeamSettings(ctx) : false;
  const restrictToEditorExperience =
    ctx && isTowerTeamAdminRole(ctx.memberRole) ? ctx.beaconRestrictToEditorExperience : false;

  const activeId = ctx?.activeOrganizationId ?? null;
  let activeOrganizationName = activeId !== null ? (workspaces.find((w) => w.id === activeId)?.name ?? null) : null;
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
    editorExperience,
    canManageTeamBeaconSettings,
    restrictToEditorExperience,
    workspaceMemberRole: ctx?.memberRole ?? null,
    appUserRole: ctx?.appUserRole ?? null,
    hasActiveWorkspace: Boolean(activeId),
    workspaces,
    activeOrganizationId: activeId,
    activeOrganizationName,
  };
}

export async function GET(req: Request) {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.userId) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  const ctx = await resolveBeaconMembershipContext(req);
  if (!ctx) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  const payload = await loadEffectiveSettings(auth.userId, ctx);

  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.userId) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ctx = await resolveBeaconMembershipContext(req);
  if (!ctx) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  const { organizationId: organizationIdFromBody, patch } = extractBody(rawBody);
  if (
    rawBody &&
    typeof rawBody === "object" &&
    !Array.isArray(rawBody) &&
    "organizationId" in rawBody &&
    typeof (rawBody as Record<string, unknown>).organizationId === "string" &&
    !isProductAdminAppRole(ctx.appUserRole)
  ) {
    return Response.json({ error: "organizationId is only valid for product admins" }, { status: 400 });
  }

  const editorExperience = computeBeaconEditorExperience(ctx);
  const canManageTeam = canManageBeaconTeamSettings(ctx);
  const { team, personal } = splitBeaconSettingsPatch(patch);

  const teamPatch = parseBeaconOrgTeamSettingsPartial(team);

  if (editorExperience && Object.keys(teamPatch).length > 0) {
    return Response.json({ error: "Team presets are locked in editor mode" }, { status: 403 });
  }

  const personalToApply = editorExperience ? stripPersonalForEditor(personal) : personal;

  const targetOrgId = await resolveTargetOrganizationIdForTeamSettings(ctx, organizationIdFromBody);
  if (organizationIdFromBody?.trim() && isProductAdminAppRole(ctx.appUserRole) && !targetOrgId) {
    return Response.json({ error: "Unknown organization" }, { status: 400 });
  }

  await persistTeamBeaconPatch(auth.userId, {
    teamPatch,
    canManageTeam,
    targetOrgId,
  });

  if (Object.keys(personalToApply).length > 0) {
    await upsertUserBeaconPayload(auth.userId, personalToApply);
  }

  const nextCtx = await resolveBeaconMembershipContext(req);
  if (!nextCtx) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  const payload = await loadEffectiveSettings(auth.userId, nextCtx);

  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
