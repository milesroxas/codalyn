import { createAccessControl } from "better-auth/plugins/access";
import { defaultRoles } from "better-auth/plugins/organization/access";

/**
 * Team tenant roles (stored on `member.role`):
 * - `admin` / `owner` — manage org, members, invitations, role assignments, seats/billing
 * - `designer` — workspace design (no member or invitation management)
 * - `editor` — read-focused workspace access
 *
 * Single source of truth for Better Auth organization plugin (server) and
 * `organizationClient` (browser) so permission checks stay aligned.
 */
export const TOWER_TEAM_ROLES = ["admin", "designer", "editor"] as const;
export type TowerTeamRole = (typeof TOWER_TEAM_ROLES)[number];

/** Roles that may manage members, invitations, and role assignments (enforced in AC + UI). */
const TOWER_TEAM_ADMIN_ROLE_KEYS = ["admin", "owner"] as const;

export function isTowerTeamAdminRole(role: string | null | undefined): boolean {
  if (!role) {
    return false;
  }
  return (TOWER_TEAM_ADMIN_ROLE_KEYS as readonly string[]).includes(role);
}

const towerOrgStatements = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  workspace: ["read", "design", "manage_seats", "billing"],
} as const;

const ac = createAccessControl(towerOrgStatements);

const teamAdminRole = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  ac: ["create", "read", "update", "delete"],
  workspace: ["read", "design", "manage_seats", "billing"],
});

const designerRole = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
  workspace: ["read", "design"],
});

const editorRole = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ["read"],
  workspace: ["read"],
});

export const towerOrganizationAc = ac;

/** Pass to `organization({ roles })` and `organizationClient({ ac, roles, schema })`. */
export const towerOrganizationRoles = {
  ...defaultRoles,
  admin: teamAdminRole,
  owner: teamAdminRole,
  member: editorRole,
  designer: designerRole,
  editor: editorRole,
} as const;

export const towerOrganizationClientSchema = {
  organization: {
    additionalFields: {
      seatLimit: { type: "number", required: false, input: true },
      stripeCustomerId: { type: "string", required: false, input: false },
      stripeSubscriptionId: { type: "string", required: false, input: false },
      subscriptionStatus: { type: "string", required: false, input: false },
      billingPlan: { type: "string", required: false, input: false },
    },
  },
} as const;
