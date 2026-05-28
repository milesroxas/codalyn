import { and, desc, eq, sql } from "drizzle-orm";
import {
  type CustomerEarlyAccessInviteResult,
  deliverEarlyAccessApproval,
  inviteCustomerForEarlyAccess,
} from "@/server/access/customer-early-access-invite";
import { emailHasPendingOrgInvitation, normalizeAccessEmail, userMaySignIn } from "@/server/access/early-access";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { sendEarlyAccessDeclinedEmail } from "@/server/email/early-access-declined-email";
import { sendEarlyAccessRequestConfirmationEmail } from "@/server/email/early-access-request-confirmation-email";
import { sendEarlyAccessRequestNotificationEmail } from "@/server/email/early-access-request-notification-email";
import { listProductAdminEmails } from "@/server/membership/product-admin";
import { normalizeEarlyAccessRequestNameFields } from "@/shared/lib/access/early-access-request-name";
import { db } from "@/shared/lib/db";
import { earlyAccessRequest, user } from "@/shared/lib/db/auth-schema";

export type EarlyAccessRequestRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  note: string | null;
  teamMemberEmails: string[] | null;
  status: string;
  declineReason: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
};

export type EarlyAccessRequestSubmitOutcome = "created" | "already_pending" | "already_has_access";

async function emailAlreadyHasAccess(email: string): Promise<boolean> {
  const normalized = normalizeAccessEmail(email);
  if (await emailHasPendingOrgInvitation(normalized)) {
    return true;
  }
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      earlyAccessGrantedAt: user.earlyAccessGrantedAt,
    })
    .from(user)
    .where(sql`lower(${user.email}) = ${normalized}`)
    .limit(1);
  if (!row) {
    return false;
  }
  return userMaySignIn(row);
}

export async function lookupEarlyAccessRequestProfileByEmail(
  email: string
): Promise<{ firstName: string | null; lastName: string | null }> {
  const normalized = normalizeAccessEmail(email);
  const [row] = await db
    .select({
      firstName: earlyAccessRequest.firstName,
      lastName: earlyAccessRequest.lastName,
    })
    .from(earlyAccessRequest)
    .where(eq(earlyAccessRequest.email, normalized))
    .limit(1);
  return normalizeEarlyAccessRequestNameFields({
    firstName: row?.firstName,
    lastName: row?.lastName,
  });
}

export async function submitEarlyAccessRequest(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  note?: string | null;
  teamMemberEmails?: string[] | null;
}): Promise<EarlyAccessRequestSubmitOutcome> {
  if (!isTowerEarlyAccessGateEnabled()) {
    throw new Error("gate_disabled");
  }

  const email = normalizeAccessEmail(input.email);
  if (await emailAlreadyHasAccess(email)) {
    return "already_has_access";
  }

  const { firstName, lastName } = normalizeEarlyAccessRequestNameFields(input);
  const note = input.note?.trim() || null;
  const teamMemberEmails = input.teamMemberEmails?.length ? input.teamMemberEmails : null;

  const [existing] = await db
    .select({ id: earlyAccessRequest.id, status: earlyAccessRequest.status })
    .from(earlyAccessRequest)
    .where(eq(earlyAccessRequest.email, email))
    .limit(1);

  if (existing?.status === "pending") {
    return "already_pending";
  }

  const id = crypto.randomUUID();
  if (existing) {
    await db
      .update(earlyAccessRequest)
      .set({
        status: "pending",
        firstName,
        lastName,
        note,
        teamMemberEmails,
        declineReason: null,
        resolvedAt: null,
        resolvedByUserId: null,
        createdAt: new Date(),
      })
      .where(eq(earlyAccessRequest.id, existing.id));
    await notifyEarlyAccessRequestSubmitted({ email, firstName, lastName, note, teamMemberEmails });
    return "created";
  }

  await db.insert(earlyAccessRequest).values({
    id,
    email,
    firstName,
    lastName,
    note,
    teamMemberEmails,
    status: "pending",
  });
  await notifyEarlyAccessRequestSubmitted({ email, firstName, lastName, note, teamMemberEmails });
  return "created";
}

async function notifyEarlyAccessRequestSubmitted(data: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  note: string | null;
  teamMemberEmails: string[] | null;
}): Promise<void> {
  await Promise.all([
    notifyOperatorsOfEarlyAccessRequest(data),
    sendEarlyAccessRequestConfirmationEmail({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    }),
  ]);
}

async function notifyOperatorsOfEarlyAccessRequest(data: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  note: string | null;
  teamMemberEmails: string[] | null;
}): Promise<void> {
  const operatorEmails = await listProductAdminEmails();
  if (operatorEmails.length === 0) {
    return;
  }
  await sendEarlyAccessRequestNotificationEmail({
    operatorEmails,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    note: data.note,
    teamMemberEmails: data.teamMemberEmails,
  });
}

export async function listEarlyAccessRequests(
  status: "pending" | "approved" | "dismissed" | "all"
): Promise<EarlyAccessRequestRow[]> {
  const base = db
    .select({
      id: earlyAccessRequest.id,
      email: earlyAccessRequest.email,
      firstName: earlyAccessRequest.firstName,
      lastName: earlyAccessRequest.lastName,
      note: earlyAccessRequest.note,
      teamMemberEmails: earlyAccessRequest.teamMemberEmails,
      status: earlyAccessRequest.status,
      declineReason: earlyAccessRequest.declineReason,
      createdAt: earlyAccessRequest.createdAt,
      resolvedAt: earlyAccessRequest.resolvedAt,
      resolvedByUserId: earlyAccessRequest.resolvedByUserId,
    })
    .from(earlyAccessRequest);

  if (status === "all") {
    return base.orderBy(desc(earlyAccessRequest.createdAt));
  }
  return base.where(eq(earlyAccessRequest.status, status)).orderBy(desc(earlyAccessRequest.createdAt));
}

export async function approveEarlyAccessRequest(
  requestId: string,
  operatorUserId: string,
  inviterLabel: string
): Promise<{ inviteUrl?: string; signInUrl?: string }> {
  const [row] = await db
    .select({
      id: earlyAccessRequest.id,
      email: earlyAccessRequest.email,
      status: earlyAccessRequest.status,
    })
    .from(earlyAccessRequest)
    .where(eq(earlyAccessRequest.id, requestId))
    .limit(1);

  if (!row) {
    throw new Error("not_found");
  }
  if (row.status !== "pending") {
    throw new Error("not_pending");
  }

  const invite = await inviteCustomerForEarlyAccess(row.email, inviterLabel, "early_access_request");

  await db
    .update(earlyAccessRequest)
    .set({
      status: "approved",
      resolvedAt: new Date(),
      resolvedByUserId: operatorUserId,
    })
    .where(eq(earlyAccessRequest.id, requestId));

  return invite.kind === "new_user" ? { inviteUrl: invite.inviteUrl } : { signInUrl: invite.signInUrl };
}

async function requireApprovedEarlyAccessRequest(requestId: string): Promise<{ email: string }> {
  const [row] = await db
    .select({
      email: earlyAccessRequest.email,
      status: earlyAccessRequest.status,
    })
    .from(earlyAccessRequest)
    .where(eq(earlyAccessRequest.id, requestId))
    .limit(1);

  if (!row) {
    throw new Error("not_found");
  }
  if (row.status !== "approved") {
    throw new Error("not_approved");
  }
  return { email: row.email };
}

export async function resendEarlyAccessRequestApproval(
  requestId: string,
  inviterLabel: string
): Promise<CustomerEarlyAccessInviteResult> {
  const row = await requireApprovedEarlyAccessRequest(requestId);
  return deliverEarlyAccessApproval(row.email, {
    sendEmail: true,
    reason: "early_access_request",
    inviterLabel,
    applyGrants: false,
  });
}

export async function getEarlyAccessRequestInviteLink(
  requestId: string,
  inviterLabel: string
): Promise<CustomerEarlyAccessInviteResult> {
  const row = await requireApprovedEarlyAccessRequest(requestId);
  return deliverEarlyAccessApproval(row.email, {
    sendEmail: false,
    reason: "early_access_request",
    inviterLabel,
    applyGrants: false,
  });
}

export async function dismissEarlyAccessRequest(
  requestId: string,
  operatorUserId: string,
  declineReason: string
): Promise<void> {
  const reason = declineReason.trim();
  if (!reason) {
    throw new Error("decline_reason_required");
  }

  const [row] = await db
    .select({
      id: earlyAccessRequest.id,
      email: earlyAccessRequest.email,
      firstName: earlyAccessRequest.firstName,
      lastName: earlyAccessRequest.lastName,
      status: earlyAccessRequest.status,
    })
    .from(earlyAccessRequest)
    .where(eq(earlyAccessRequest.id, requestId))
    .limit(1);

  if (!row) {
    throw new Error("not_found");
  }
  if (row.status !== "pending") {
    throw new Error("not_pending");
  }

  await sendEarlyAccessDeclinedEmail({
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    declineReason: reason,
  });

  await db
    .update(earlyAccessRequest)
    .set({
      status: "dismissed",
      declineReason: reason,
      resolvedAt: new Date(),
      resolvedByUserId: operatorUserId,
    })
    .where(eq(earlyAccessRequest.id, requestId));
}

/** Count pending requests for operator metrics. */
export async function countPendingEarlyAccessRequests(): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(earlyAccessRequest)
    .where(eq(earlyAccessRequest.status, "pending"));
  return Number(n ?? 0);
}

/** Reconcile queue when access was granted outside the request flow (e.g. direct customer invite). */
export async function syncEarlyAccessRequestForEmail(email: string, operatorUserId: string | null): Promise<void> {
  const normalized = normalizeAccessEmail(email);
  await db
    .update(earlyAccessRequest)
    .set({
      status: "approved",
      resolvedAt: new Date(),
      resolvedByUserId: operatorUserId,
    })
    .where(and(eq(earlyAccessRequest.email, normalized), eq(earlyAccessRequest.status, "pending")));
}
