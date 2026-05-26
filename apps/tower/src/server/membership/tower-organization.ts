import { organization } from "better-auth/plugins";
import { grantEarlyAccess } from "@/server/access/early-access";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { resolveMembershipSeatCapFromOrg } from "@/server/billing/team-billing-config";
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
  membershipLimit: async (_user, org) => resolveMembershipSeatCapFromOrg(org as { seatLimit?: number | null }),
  sendInvitationEmail: async (data) => {
    await sendOrganizationInvitationEmail(data);
  },
  organizationHooks: {
    afterAcceptInvitation: async ({ user, organization: org }) => {
      await grantEarlyAccess(user.id);
      await syncOrganizationSeatQuantityWithStripe(org.id);
    },
    afterAddMember: async ({ user, organization: org }) => {
      await grantEarlyAccess(user.id);
      await syncOrganizationSeatQuantityWithStripe(org.id);
    },
    afterRemoveMember: async ({ organization: org }) => {
      await syncOrganizationSeatQuantityWithStripe(org.id);
    },
    afterCancelInvitation: async ({ organization: org }) => {
      await syncOrganizationSeatQuantityWithStripe(org.id);
    },
  },
});
