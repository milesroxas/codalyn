import { APIError } from "better-auth/api";
import { organization } from "better-auth/plugins";
import { grantEarlyAccess } from "@/server/access/early-access";
import {
  assertOrganizationNotOverSeatCap,
  assertOrganizationSeatAvailable,
  resolveOrganizationInvitationLimitForOrg,
} from "@/server/billing/organization-seat-count";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { resolveMembershipSeatCapFromOrg } from "@/server/billing/team-billing-config";
import { sendOrganizationInvitationEmail } from "@/server/email/organization-invitation-email";
import { isTowerProductAdmin } from "@/server/membership/product-admin";
import {
  assertWorkspaceSlugAvailableForUpdate,
  isWorkspaceSlugTaken,
  resolveWorkspaceSlugForCreate,
  resolveWorkspaceSlugInput,
} from "@/server/membership/workspace-slug-update";
import {
  towerOrganizationClientSchema,
  towerOrganizationRoles,
} from "@/shared/lib/membership/tower-organization-access";
import { workspaceSlugErrorMessage } from "@/shared/lib/membership/workspace-slug-messages";

export {
  isTowerTeamAdminRole,
  TOWER_TEAM_ROLES,
  type TowerTeamRole,
} from "@/shared/lib/membership/tower-organization-access";

export const towerOrganization = organization({
  creatorRole: "admin",
  roles: towerOrganizationRoles,
  schema: towerOrganizationClientSchema,
  /** All workspace deletes go through `deleteWorkspace` (Stripe cancel, session cleanup, slug confirm). */
  disableOrganizationDeletion: true,
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
  invitationLimit: async ({ organization: org }) =>
    resolveOrganizationInvitationLimitForOrg(org.id, org as { seatLimit?: number | null }),
  sendInvitationEmail: async (data) => {
    await sendOrganizationInvitationEmail(data);
  },
  organizationHooks: {
    beforeCreateOrganization: async ({ organization: orgInput }) => {
      const parsed = resolveWorkspaceSlugForCreate(orgInput);
      if (!parsed.ok) {
        throw new APIError("BAD_REQUEST", {
          message: workspaceSlugErrorMessage(parsed.error),
          code: parsed.error,
        });
      }
      if (await isWorkspaceSlugTaken(parsed.slug)) {
        throw new APIError("BAD_REQUEST", {
          message: workspaceSlugErrorMessage("slug_taken"),
          code: "slug_taken",
        });
      }
      return {
        data: {
          ...orgInput,
          slug: parsed.slug,
        },
      };
    },
    beforeUpdateOrganization: async ({ organization: orgInput, member }) => {
      if (typeof orgInput.slug !== "string") {
        return;
      }
      const parsed = resolveWorkspaceSlugInput(orgInput.slug);
      if (!parsed.ok) {
        throw new APIError("BAD_REQUEST", {
          message: workspaceSlugErrorMessage(parsed.error),
          code: parsed.error,
        });
      }
      await assertWorkspaceSlugAvailableForUpdate(parsed.slug, member.organizationId);
      return {
        data: {
          ...orgInput,
          slug: parsed.slug,
        },
      };
    },
    beforeCreateInvitation: async ({ organization: org }) => {
      await assertOrganizationSeatAvailable(org.id, org as { seatLimit?: number | null });
    },
    afterCreateInvitation: async ({ organization: org }) => {
      await syncOrganizationSeatQuantityWithStripe(org.id);
    },
    beforeAcceptInvitation: async ({ organization: org }) => {
      await assertOrganizationNotOverSeatCap(org.id, org as { seatLimit?: number | null });
    },
    beforeAddMember: async ({ member: m, organization: org }) => {
      await assertOrganizationSeatAvailable(m.organizationId, org as { seatLimit?: number | null });
    },
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
