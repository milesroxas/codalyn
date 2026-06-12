import { desc, eq, sql } from "drizzle-orm";
import { sendFlintBetaGroupRequestConfirmationEmail } from "@/server/email/flint-beta-group-request-confirmation-email";
import { sendFlintBetaGroupRequestNotificationEmail } from "@/server/email/flint-beta-group-request-notification-email";
import { listProductAdminEmails } from "@/server/membership/product-admin";
import { parseEarlyAccessRequestNameBody } from "@/shared/lib/access/early-access-request-name";
import { parseAccessEmailInput } from "@/shared/lib/access/email-input";
import { db } from "@/shared/lib/db";
import { flintBetaGroupRequest } from "@/shared/lib/db/auth-schema";

export type FlintBetaGroupRequestStatus = "pending" | "resolved" | "dismissed";

export type FlintBetaGroupRequestRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: FlintBetaGroupRequestStatus;
  operatorNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
};

export type FlintBetaGroupRequestSubmitOutcome = "created" | "already_pending";

function parseFlintBetaGroupRequestStatus(raw: unknown): FlintBetaGroupRequestStatus | null {
  if (raw === "pending" || raw === "resolved" || raw === "dismissed") {
    return raw;
  }
  return null;
}

export async function submitFlintBetaGroupRequest(input: {
  email: unknown;
  firstName?: unknown;
  lastName?: unknown;
}): Promise<FlintBetaGroupRequestSubmitOutcome> {
  const email = parseAccessEmailInput(input.email);
  if (!email) {
    throw new Error("invalid_email");
  }

  const { firstName, lastName } = parseEarlyAccessRequestNameBody({
    firstName: input.firstName,
    lastName: input.lastName,
  });

  const [existing] = await db
    .select({ id: flintBetaGroupRequest.id, status: flintBetaGroupRequest.status })
    .from(flintBetaGroupRequest)
    .where(eq(flintBetaGroupRequest.email, email))
    .limit(1);

  if (existing?.status === "pending") {
    return "already_pending";
  }

  if (existing) {
    await db
      .update(flintBetaGroupRequest)
      .set({
        status: "pending",
        firstName,
        lastName,
        operatorNote: null,
        resolvedAt: null,
        resolvedByUserId: null,
        createdAt: new Date(),
      })
      .where(eq(flintBetaGroupRequest.id, existing.id));
    await notifyFlintBetaGroupRequestSubmitted({ email, firstName, lastName });
    return "created";
  }

  await db.insert(flintBetaGroupRequest).values({
    id: crypto.randomUUID(),
    email,
    firstName,
    lastName,
    status: "pending",
  });
  await notifyFlintBetaGroupRequestSubmitted({ email, firstName, lastName });
  return "created";
}

async function notifyFlintBetaGroupRequestSubmitted(data: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): Promise<void> {
  await Promise.all([
    notifyOperatorsOfFlintBetaGroupRequest(data),
    sendFlintBetaGroupRequestConfirmationEmail({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    }),
  ]);
}

async function notifyOperatorsOfFlintBetaGroupRequest(data: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): Promise<void> {
  const operatorEmails = await listProductAdminEmails();
  if (operatorEmails.length === 0) {
    return;
  }
  await sendFlintBetaGroupRequestNotificationEmail({
    operatorEmails,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
  });
}

export async function listFlintBetaGroupRequests(
  status: FlintBetaGroupRequestStatus | "all"
): Promise<FlintBetaGroupRequestRow[]> {
  const base = db
    .select({
      id: flintBetaGroupRequest.id,
      email: flintBetaGroupRequest.email,
      firstName: flintBetaGroupRequest.firstName,
      lastName: flintBetaGroupRequest.lastName,
      status: flintBetaGroupRequest.status,
      operatorNote: flintBetaGroupRequest.operatorNote,
      createdAt: flintBetaGroupRequest.createdAt,
      resolvedAt: flintBetaGroupRequest.resolvedAt,
      resolvedByUserId: flintBetaGroupRequest.resolvedByUserId,
    })
    .from(flintBetaGroupRequest);

  const rows =
    status === "all"
      ? await base.orderBy(desc(flintBetaGroupRequest.createdAt))
      : await base.where(eq(flintBetaGroupRequest.status, status)).orderBy(desc(flintBetaGroupRequest.createdAt));

  return rows.map((row) => ({
    ...row,
    status: row.status as FlintBetaGroupRequestStatus,
  }));
}

async function loadPendingFlintBetaGroupRequest(requestId: string) {
  const [row] = await db
    .select({
      id: flintBetaGroupRequest.id,
      status: flintBetaGroupRequest.status,
    })
    .from(flintBetaGroupRequest)
    .where(eq(flintBetaGroupRequest.id, requestId))
    .limit(1);
  return row ?? null;
}

export async function resolveFlintBetaGroupRequest(
  requestId: string,
  operatorUserId: string,
  operatorNote?: string | null
): Promise<void> {
  const row = await loadPendingFlintBetaGroupRequest(requestId);
  if (!row) {
    throw new Error("not_found");
  }
  if (row.status !== "pending") {
    throw new Error("not_pending");
  }

  await db
    .update(flintBetaGroupRequest)
    .set({
      status: "resolved",
      resolvedAt: new Date(),
      resolvedByUserId: operatorUserId,
      operatorNote: operatorNote?.trim() || null,
    })
    .where(eq(flintBetaGroupRequest.id, requestId));
}

export async function dismissFlintBetaGroupRequest(
  requestId: string,
  operatorUserId: string,
  operatorNote?: string | null
): Promise<void> {
  const row = await loadPendingFlintBetaGroupRequest(requestId);
  if (!row) {
    throw new Error("not_found");
  }
  if (row.status !== "pending") {
    throw new Error("not_pending");
  }

  await db
    .update(flintBetaGroupRequest)
    .set({
      status: "dismissed",
      resolvedAt: new Date(),
      resolvedByUserId: operatorUserId,
      operatorNote: operatorNote?.trim() || null,
    })
    .where(eq(flintBetaGroupRequest.id, requestId));
}

export async function countPendingFlintBetaGroupRequests(): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(flintBetaGroupRequest)
    .where(eq(flintBetaGroupRequest.status, "pending"));
  return Number(n ?? 0);
}

export function parseFlintBetaGroupRequestListStatus(raw: string | null): FlintBetaGroupRequestStatus | "all" {
  const status = parseFlintBetaGroupRequestStatus(raw);
  if (raw === "all") {
    return "all";
  }
  return status ?? "pending";
}
