import { and, desc, eq, sql } from "drizzle-orm";
import { inviteCustomerForEarlyAccess } from "@/server/access/customer-early-access-invite";
import { emailHasPendingOrgInvitation, normalizeAccessEmail, userMaySignIn } from "@/server/access/early-access";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";
import { db } from "@/shared/lib/db";
import { earlyAccessRequest, user } from "@/shared/lib/db/auth-schema";

export type EarlyAccessRequestRow = {
  id: string;
  email: string;
  name: string | null;
  note: string | null;
  teamMemberEmails: string[] | null;
  status: string;
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

export async function submitEarlyAccessRequest(input: {
  email: string;
  name?: string | null;
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

  const name = input.name?.trim() || null;
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
        name,
        note,
        teamMemberEmails,
        resolvedAt: null,
        resolvedByUserId: null,
        createdAt: new Date(),
      })
      .where(eq(earlyAccessRequest.id, existing.id));
    return "created";
  }

  await db.insert(earlyAccessRequest).values({
    id,
    email,
    name,
    note,
    teamMemberEmails,
    status: "pending",
  });
  return "created";
}

export async function listEarlyAccessRequests(
  status: "pending" | "approved" | "dismissed" | "all"
): Promise<EarlyAccessRequestRow[]> {
  const base = db
    .select({
      id: earlyAccessRequest.id,
      email: earlyAccessRequest.email,
      name: earlyAccessRequest.name,
      note: earlyAccessRequest.note,
      teamMemberEmails: earlyAccessRequest.teamMemberEmails,
      status: earlyAccessRequest.status,
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
): Promise<{ inviteUrl?: string }> {
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

  const invite = await inviteCustomerForEarlyAccess(row.email, inviterLabel);

  await db
    .update(earlyAccessRequest)
    .set({
      status: "approved",
      resolvedAt: new Date(),
      resolvedByUserId: operatorUserId,
    })
    .where(eq(earlyAccessRequest.id, requestId));

  return invite.kind === "new_user" ? { inviteUrl: invite.inviteUrl } : {};
}

export async function dismissEarlyAccessRequest(requestId: string, operatorUserId: string): Promise<void> {
  const [row] = await db
    .select({ id: earlyAccessRequest.id, status: earlyAccessRequest.status })
    .from(earlyAccessRequest)
    .where(eq(earlyAccessRequest.id, requestId))
    .limit(1);

  if (!row) {
    throw new Error("not_found");
  }
  if (row.status !== "pending") {
    throw new Error("not_pending");
  }

  await db
    .update(earlyAccessRequest)
    .set({
      status: "dismissed",
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
