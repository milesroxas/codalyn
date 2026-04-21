import { organization } from "better-auth/plugins";
import { sendOrganizationInvitationEmail } from "@/server/email/organization-invitation-email";
import { isTowerProductAdmin } from "@/server/membership/product-admin";
import {
  towerOrganizationClientSchema,
  towerOrganizationRoles,
} from "@/shared/lib/membership/tower-organization-access";

export {
  isTowerTeamAdminRole,
  TOWER_TEAM_ROLES,
  type TowerTeamRole,
} from "@/shared/lib/membership/tower-organization-access";

function resolveMembershipSeatCap(organization: Record<string, unknown>) {
  const raw = organization.seatLimit;
  if (raw != null && typeof raw === "number" && !Number.isNaN(raw)) {
    return Math.max(1, raw);
  }
  return 10_000;
}

export const towerOrganization = organization({
  creatorRole: "admin",
  roles: towerOrganizationRoles,
  schema: towerOrganizationClientSchema,
  /**
   * Team workspaces are a product tier: only SaaS operators (`product_admin`) or users with
   * `canCreateOrganization` (billing upgrade, signup intent, etc.) may create organizations.
   */
  allowUserToCreateOrganization: async (user) => {
    if (isTowerProductAdmin(user)) {
      return true;
    }
    return Boolean(user.canCreateOrganization);
  },
  membershipLimit: async (_user, org) => resolveMembershipSeatCap(org as Record<string, unknown>),
  sendInvitationEmail: async (data) => {
    await sendOrganizationInvitationEmail(data);
  },
});
