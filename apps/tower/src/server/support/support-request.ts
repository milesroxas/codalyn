import { and, desc, eq, sql } from "drizzle-orm";
import { sendSupportRequestNotificationEmail } from "@/server/email/support-request-notification-email";
import { listProductAdminEmails } from "@/server/membership/product-admin";
import { parseAccessEmailInput } from "@/shared/lib/access/email-input";
import { db } from "@/shared/lib/db";
import { supportRequest } from "@/shared/lib/db/auth-schema";
import {
  isTowerSupportRequestKind,
  isTowerSupportRequestTopic,
  type TowerSupportRequestKind,
  towerSupportRequestTopicLabel,
} from "@/shared/lib/support/tower-support-request";

export type SupportRequestStatus = "pending" | "resolved" | "dismissed";

export type SupportRequestRow = {
  id: string;
  kind: TowerSupportRequestKind;
  topic: string;
  details: string;
  email: string;
  userId: string | null;
  status: SupportRequestStatus;
  operatorNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
};

const MAX_DETAILS_LENGTH = 8000;

function parseSupportRequestStatus(raw: unknown): SupportRequestStatus | null {
  if (raw === "pending" || raw === "resolved" || raw === "dismissed") {
    return raw;
  }
  return null;
}

function parseDetailsInput(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const details = raw.trim();
  if (!details) {
    return null;
  }
  if (details.length > MAX_DETAILS_LENGTH) {
    return null;
  }
  return details;
}

export async function submitSupportRequest(input: {
  kind: unknown;
  topic: unknown;
  details: unknown;
  email: unknown;
  userId?: string | null;
}): Promise<{ id: string }> {
  if (!isTowerSupportRequestKind(input.kind)) {
    throw new Error("invalid_kind");
  }

  const email = parseAccessEmailInput(input.email);
  if (!email) {
    throw new Error("invalid_email");
  }

  const topic = typeof input.topic === "string" ? input.topic.trim() : "";
  if (!topic || !isTowerSupportRequestTopic(input.kind, topic)) {
    throw new Error("invalid_topic");
  }

  const details = parseDetailsInput(input.details);
  if (!details) {
    throw new Error("invalid_details");
  }

  const id = crypto.randomUUID();
  await db.insert(supportRequest).values({
    id,
    kind: input.kind,
    topic,
    details,
    email,
    userId: input.userId ?? null,
    status: "pending",
  });

  const operatorEmails = await listProductAdminEmails();
  if (operatorEmails.length > 0) {
    await sendSupportRequestNotificationEmail({
      operatorEmails,
      kind: input.kind,
      topicLabel: towerSupportRequestTopicLabel(input.kind, topic),
      details,
      email,
    });
  }

  return { id };
}

export async function listSupportRequests(input: {
  status: SupportRequestStatus | "all";
  kind?: TowerSupportRequestKind | "all";
}): Promise<SupportRequestRow[]> {
  const conditions = [];
  if (input.status !== "all") {
    conditions.push(eq(supportRequest.status, input.status));
  }
  if (input.kind && input.kind !== "all") {
    conditions.push(eq(supportRequest.kind, input.kind));
  }

  const base = db
    .select({
      id: supportRequest.id,
      kind: supportRequest.kind,
      topic: supportRequest.topic,
      details: supportRequest.details,
      email: supportRequest.email,
      userId: supportRequest.userId,
      status: supportRequest.status,
      operatorNote: supportRequest.operatorNote,
      createdAt: supportRequest.createdAt,
      resolvedAt: supportRequest.resolvedAt,
      resolvedByUserId: supportRequest.resolvedByUserId,
    })
    .from(supportRequest);

  const rows =
    conditions.length === 0
      ? await base.orderBy(desc(supportRequest.createdAt))
      : await base.where(and(...conditions)).orderBy(desc(supportRequest.createdAt));

  return rows.map((row) => ({
    ...row,
    kind: row.kind as TowerSupportRequestKind,
    status: row.status as SupportRequestStatus,
  }));
}

async function loadPendingSupportRequest(requestId: string) {
  const [row] = await db
    .select({
      id: supportRequest.id,
      status: supportRequest.status,
    })
    .from(supportRequest)
    .where(eq(supportRequest.id, requestId))
    .limit(1);
  return row ?? null;
}

export async function resolveSupportRequest(
  requestId: string,
  operatorUserId: string,
  operatorNote?: string | null
): Promise<void> {
  const row = await loadPendingSupportRequest(requestId);
  if (!row) {
    throw new Error("not_found");
  }
  if (row.status !== "pending") {
    throw new Error("not_pending");
  }

  await db
    .update(supportRequest)
    .set({
      status: "resolved",
      resolvedAt: new Date(),
      resolvedByUserId: operatorUserId,
      operatorNote: operatorNote?.trim() || null,
    })
    .where(eq(supportRequest.id, requestId));
}

export async function dismissSupportRequest(
  requestId: string,
  operatorUserId: string,
  operatorNote?: string | null
): Promise<void> {
  const row = await loadPendingSupportRequest(requestId);
  if (!row) {
    throw new Error("not_found");
  }
  if (row.status !== "pending") {
    throw new Error("not_pending");
  }

  await db
    .update(supportRequest)
    .set({
      status: "dismissed",
      resolvedAt: new Date(),
      resolvedByUserId: operatorUserId,
      operatorNote: operatorNote?.trim() || null,
    })
    .where(eq(supportRequest.id, requestId));
}

export async function patchSupportRequestOperatorNote(requestId: string, operatorNote: string | null): Promise<void> {
  const note = operatorNote?.trim() || null;
  const [row] = await db
    .select({ id: supportRequest.id })
    .from(supportRequest)
    .where(eq(supportRequest.id, requestId))
    .limit(1);
  if (!row) {
    throw new Error("not_found");
  }

  await db.update(supportRequest).set({ operatorNote: note }).where(eq(supportRequest.id, requestId));
}

export async function countPendingSupportRequests(): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(supportRequest)
    .where(eq(supportRequest.status, "pending"));
  return Number(n ?? 0);
}

export function parseSupportRequestListStatus(raw: string | null): SupportRequestStatus | "all" {
  const status = parseSupportRequestStatus(raw);
  if (raw === "all") {
    return "all";
  }
  return status ?? "pending";
}

export function parseSupportRequestListKind(raw: string | null): TowerSupportRequestKind | "all" {
  if (raw === "feedback" || raw === "help") {
    return raw;
  }
  return "all";
}
