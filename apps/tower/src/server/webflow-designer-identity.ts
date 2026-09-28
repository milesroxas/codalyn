import { and, eq, inArray, isNull } from "drizzle-orm";
import { auth } from "@/server/auth";
import { decryptStoredSecret } from "@/server/security/secret-encryption";
import { WEBFLOW_DATA_API_APP_KEY, type WebflowAppKey } from "@/server/webflow-app-registry";
import { listOrganizationIdsLinkedToWebflowSite } from "@/server/webflow-organization-sites";
import { fetchWebflowAuthorizedUserId } from "@/server/webflow-token-identity";
import { db } from "@/shared/lib/db";
import { account, member, organization, organizationWebflowOAuthToken, user } from "@/shared/lib/db/auth-schema";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

/**
 * Which Tower account a verified Webflow user signs into from the Designer.
 *
 * The identity key is the Webflow `authorized_user` id — the same id `POST /beta/token/resolve` returns
 * for a Designer ID token and `GET /v2/token/authorized_by` returns for an OAuth access token. It is
 * associated with a Tower account in two ways, neither of which looks at e-mail addresses:
 *
 *  1. **Designer link** — a Better Auth `account` row (`providerId: "webflow"`, `accountId: <Webflow user id>`),
 *     written when the Webflow user signs in through the Designer, plus the legacy unique
 *     `user.webflow_authorized_user_id` column.
 *  2. **Install-time authorization** — the Webflow user who approved a workspace's OAuth token is recorded on
 *     the token row (`webflow_authorized_user_id`) together with the Tower account whose session completed
 *     the OAuth (`authorized_by_user_id`); the callback also writes the Designer link for that pair. Rows
 *     that predate those columns are resolved lazily by asking Webflow who authorized the stored token.
 *
 * Marketplace review round 9 (2026-09-28): "Associate the verified Webflow user ID with the existing Tower
 * account and install-time authorization rather than relying on matching email addresses."
 */

/** Better Auth `account.providerId` for the federated Webflow Designer identity. */
export const WEBFLOW_DESIGNER_PROVIDER_ID = "webflow";

export type BoundTowerUserCandidate = {
  userId: string;
  /** When the Designer link was written (the legacy column reports the user's last update). */
  boundAt: Date;
  /** The candidate is a live member of a workspace whose stored token reaches the Designer's current site. */
  holdsAuthorizationForSite: boolean;
};

/**
 * Pure: the Tower account to sign a Webflow user into when more than one is linked to them (rare — an
 * automatically provisioned account and the account that later completed the install, say). The one
 * holding an authorization for the site open in the Designer wins; otherwise the most recent link.
 */
export function chooseBoundTowerUser(candidates: readonly BoundTowerUserCandidate[]): string | null {
  if (candidates.length === 0) {
    return null;
  }
  const sorted = [...candidates].sort((a, b) => {
    if (a.holdsAuthorizationForSite !== b.holdsAuthorizationForSite) {
      return a.holdsAuthorizationForSite ? -1 : 1;
    }
    return b.boundAt.getTime() - a.boundAt.getTime();
  });
  return sorted[0]?.userId ?? null;
}

export type InstallerCandidateInput = {
  /** `authorized_by_user_id` on the token row, when the callback recorded it. */
  recordedInstallerUserId: string | null;
  /** `organization.owner_user_id`. */
  ownerUserId: string | null;
  /** Live members holding a team-admin role (admin / owner) — the only members who can run the OAuth. */
  adminMemberUserIds: readonly string[];
};

/**
 * Pure: which member of a workspace is its install-time account for a stored token. The recorded
 * installer when still an admin; else the workspace owner when an admin; else the sole admin. With
 * several admins and nothing recorded the account is ambiguous and nothing is chosen — a Webflow user
 * is never guessed into someone else's account.
 */
export function chooseInstallerForOrganization(input: InstallerCandidateInput): string | null {
  const admins = new Set(input.adminMemberUserIds);
  if (input.recordedInstallerUserId && admins.has(input.recordedInstallerUserId)) {
    return input.recordedInstallerUserId;
  }
  if (input.ownerUserId && admins.has(input.ownerUserId)) {
    return input.ownerUserId;
  }
  if (admins.size === 1) {
    return [...admins][0] ?? null;
  }
  return null;
}

/**
 * Webflow users linked to a Tower user (the reverse of {@link listTowerUsersBoundToWebflowUser}): the
 * `account` rows plus the legacy column. Lets a Tower account start the Designer OAuth flow when its
 * identity lives only in an `account` row (the legacy column can hold one id per user and is unique).
 */
export async function listWebflowUserIdsBoundToTowerUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ webflowUserId: account.accountId })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, WEBFLOW_DESIGNER_PROVIDER_ID)));
  const out = new Set(rows.map((row) => row.webflowUserId));
  const [legacy] = await db
    .select({ webflowAuthorizedUserId: user.webflowAuthorizedUserId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (legacy?.webflowAuthorizedUserId) {
    out.add(legacy.webflowAuthorizedUserId);
  }
  return [...out];
}

/** Tower users linked to a Webflow user: `account` rows first, then the legacy unique user column. */
export async function listTowerUsersBoundToWebflowUser(
  webflowUserId: string
): Promise<Array<{ userId: string; boundAt: Date }>> {
  const rows = await db
    .select({ userId: account.userId, boundAt: account.createdAt })
    .from(account)
    .where(and(eq(account.providerId, WEBFLOW_DESIGNER_PROVIDER_ID), eq(account.accountId, webflowUserId)));
  const out = new Map<string, Date>();
  for (const row of rows) {
    const prev = out.get(row.userId);
    if (!prev || row.boundAt < prev) {
      out.set(row.userId, row.boundAt);
    }
  }
  const [legacy] = await db
    .select({ id: user.id, updatedAt: user.updatedAt })
    .from(user)
    .where(eq(user.webflowAuthorizedUserId, webflowUserId))
    .limit(1);
  if (legacy && !out.has(legacy.id)) {
    out.set(legacy.id, legacy.updatedAt);
  }
  return [...out].map(([userId, boundAt]) => ({ userId, boundAt }));
}

/**
 * Idempotently records that `webflowUserId` signs into `userId`: a `webflow` account row for exactly
 * this pair (never "some row for this Webflow id", which would let another account's link stand in), and
 * the legacy unique column when neither this user nor any other holds it. Never touches e-mail
 * verification or credentials — the pair is proven by the Designer ID token or by the install-time OAuth
 * completed from this account's own session, not by an inbox.
 */
export async function bindWebflowUserToTowerUser(webflowUserId: string, userId: string): Promise<void> {
  const existing = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, WEBFLOW_DESIGNER_PROVIDER_ID),
        eq(account.accountId, webflowUserId)
      )
    )
    .limit(1);
  if (existing.length === 0) {
    const ctx = await auth.$context;
    await ctx.internalAdapter.linkAccount({
      userId,
      providerId: WEBFLOW_DESIGNER_PROVIDER_ID,
      accountId: webflowUserId,
    });
  }

  const [row] = await db
    .select({ webflowAuthorizedUserId: user.webflowAuthorizedUserId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row || row.webflowAuthorizedUserId != null) {
    return;
  }
  const holder = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.webflowAuthorizedUserId, webflowUserId))
    .limit(1);
  if (holder.length === 0) {
    await db.update(user).set({ webflowAuthorizedUserId: webflowUserId }).where(eq(user.id, userId));
  }
}

/** Live members of a non-deleted workspace who hold a team-admin role (the only members who can run OAuth). */
async function listAdminMemberUserIds(organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.organizationId, organizationId), isNull(organization.deletedAt)));
  return rows.filter((row) => isTowerTeamAdminRole(row.role)).map((row) => row.userId);
}

type StoredTokenIdentityRow = {
  organizationId: string;
  appKey: string;
  accessToken: string;
  webflowAuthorizedUserId: string | null;
  authorizedByUserId: string | null;
};

const STORED_TOKEN_IDENTITY_COLUMNS = {
  organizationId: organizationWebflowOAuthToken.organizationId,
  appKey: organizationWebflowOAuthToken.appKey,
  accessToken: organizationWebflowOAuthToken.accessToken,
  webflowAuthorizedUserId: organizationWebflowOAuthToken.webflowAuthorizedUserId,
  authorizedByUserId: organizationWebflowOAuthToken.authorizedByUserId,
};

/**
 * The Webflow user who approved a stored token: the recorded value, else asked from Webflow once
 * (`GET /v2/token/authorized_by` with the stored token) and cached on the row. Null when unknown — an
 * undecryptable or rejected token proves nothing.
 */
async function resolveStoredTokenApprover(row: StoredTokenIdentityRow): Promise<string | null> {
  if (row.webflowAuthorizedUserId) {
    return row.webflowAuthorizedUserId;
  }
  const accessToken = decryptStoredSecret(row.accessToken)?.trim();
  if (!accessToken) {
    return null;
  }
  const approver = await fetchWebflowAuthorizedUserId(accessToken);
  if (!approver) {
    return null;
  }
  await db
    .update(organizationWebflowOAuthToken)
    .set({ webflowAuthorizedUserId: approver })
    .where(
      and(
        eq(organizationWebflowOAuthToken.organizationId, row.organizationId),
        eq(organizationWebflowOAuthToken.appKey, row.appKey)
      )
    );
  return approver;
}

export type InstallTimeAuthorizationUser = { userId: string; organizationId: string };

/**
 * The Tower account that holds an authorization this Webflow user approved: the workspace whose stored
 * token `webflowUserId` authorized (recorded, or resolved lazily for the workspaces linked to the site
 * open in the Designer) and, within it, the install-time account ({@link chooseInstallerForOrganization}).
 * Workspaces linked to the current site come first, so the authorization for the site in front of the
 * user wins over one they approved elsewhere.
 */
export async function findInstallTimeAuthorizationUser(
  webflowUserId: string,
  siteId: string | null,
  app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY
): Promise<InstallTimeAuthorizationUser | null> {
  const recorded = await db
    .select(STORED_TOKEN_IDENTITY_COLUMNS)
    .from(organizationWebflowOAuthToken)
    .where(eq(organizationWebflowOAuthToken.webflowAuthorizedUserId, webflowUserId));

  const siteOrgIds = siteId ? await listOrganizationIdsLinkedToWebflowSite(siteId, app) : [];
  const unresolved =
    siteOrgIds.length === 0
      ? []
      : await db
          .select(STORED_TOKEN_IDENTITY_COLUMNS)
          .from(organizationWebflowOAuthToken)
          .where(
            and(
              inArray(organizationWebflowOAuthToken.organizationId, siteOrgIds),
              eq(organizationWebflowOAuthToken.appKey, app),
              isNull(organizationWebflowOAuthToken.webflowAuthorizedUserId)
            )
          );

  const candidates: StoredTokenIdentityRow[] = [...recorded];
  for (const row of unresolved) {
    if ((await resolveStoredTokenApprover(row)) === webflowUserId) {
      candidates.push({ ...row, webflowAuthorizedUserId: webflowUserId });
    }
  }
  const linkedToSite = new Set(siteOrgIds);
  candidates.sort((a, b) => Number(linkedToSite.has(b.organizationId)) - Number(linkedToSite.has(a.organizationId)));

  for (const row of candidates) {
    const [org] = await db
      .select({ ownerUserId: organization.ownerUserId })
      .from(organization)
      .where(and(eq(organization.id, row.organizationId), isNull(organization.deletedAt)))
      .limit(1);
    if (!org) {
      continue;
    }
    const installer = chooseInstallerForOrganization({
      recordedInstallerUserId: row.authorizedByUserId,
      ownerUserId: org.ownerUserId,
      adminMemberUserIds: await listAdminMemberUserIds(row.organizationId),
    });
    if (installer) {
      return { userId: installer, organizationId: row.organizationId };
    }
  }
  return null;
}

/** Whether `userId` is a live member of a workspace whose stored `app` token is known to reach `siteId`. */
export async function userHoldsAuthorizationForSite(
  userId: string,
  siteId: string | null,
  app: WebflowAppKey = WEBFLOW_DATA_API_APP_KEY
): Promise<boolean> {
  if (!siteId) {
    return false;
  }
  const orgIds = await listOrganizationIdsLinkedToWebflowSite(siteId, app);
  if (orgIds.length === 0) {
    return false;
  }
  const rows = await db
    .select({ id: member.id })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, userId), inArray(member.organizationId, orgIds), isNull(organization.deletedAt)))
    .limit(1);
  return rows.length > 0;
}
