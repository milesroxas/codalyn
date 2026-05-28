import { APIError } from "better-auth/api";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { grantEarlyAccess } from "@/server/access/early-access";
import {
  assertOrganizationNotOverSeatCap,
  assertOrganizationSeatAvailable,
  resolveOrganizationInvitationLimitForOrg,
} from "@/server/billing/organization-seat-count";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { resolveMembershipSeatCapFromOrg } from "@/server/billing/team-billing-config";
import { sendOrganizationInvitationEmail } from "@/server/email/organization-invitation-email";
import { resolveUserWorkspaceCreationEligibility } from "@/server/membership/user-workspace-creation-eligibility";
import {
  assertWorkspaceSlugAvailableForUpdate,
  isWorkspaceSlugTaken,
  resolveWorkspaceSlugForCreate,
  resolveWorkspaceSlugInput,
} from "@/server/membership/workspace-slug-update";
import { db } from "@/shared/lib/db";
import { organization as organizationTable } from "@/shared/lib/db/auth-schema";
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
  requireEmailVerificationOnInvitation: true,
  /** All workspace deletes go through `deleteWorkspace` (Stripe cancel, session cleanup, slug confirm). */
  disableOrganizationDeletion: true,
  /**
   * Free accounts may admin one workspace; additional owned workspaces require individual Pro
   * (or `canCreateOrganization` ops / team-billing override). Non-admin memberships do not count.
   */
  allowUserToCreateOrganization: async (user) => {
    const eligibility = await resolveUserWorkspaceCreationEligibility(user.id);
    return eligibility.canCreate;
  },
  membershipLimit: async (_user, org) => resolveMembershipSeatCapFromOrg(org as { seatLimit?: number | null }),
  invitationLimit: async ({ organization: org }) =>
    resolveOrganizationInvitationLimitForOrg(org.id, org as { seatLimit?: number | null }),
  sendInvitationEmail: async (data) => {
    await sendOrganizationInvitationEmail(data);
  },
  organizationHooks: {
    beforeCreateOrganization: async ({ organization: orgInput, user }) => {
      const eligibility = await resolveUserWorkspaceCreationEligibility(user.id);
      if (!eligibility.canCreate) {
        throw new APIError("FORBIDDEN", {
          message: "Upgrade to Pro to create another workspace.",
          code: "workspace_creation_requires_pro",
        });
      }

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
          ownerUserId: user.id,
          billingOwnerUserId: null,
        },
      };
    },
    afterCreateOrganization: async ({ organization: org, user }) => {
      await db
        .update(organizationTable)
        .set({ ownerUserId: user.id, billingOwnerUserId: null })
        .where(eq(organizationTable.id, org.id));
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
