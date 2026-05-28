import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getStripe } from "@/server/billing/stripe-client";
import { ensureStripeCustomerForOrganization } from "@/server/billing/stripe-customer-org";
import { ownershipTransferErrorResponse } from "@/server/membership/workspace-ownership-transfer-http";
import { resolveTowerPublicBaseUrl } from "@/server/tower-public-url";
import { db } from "@/shared/lib/db";
import { organization, user, workspaceOwnershipTransfer } from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

type BillingSetupBody = {
  transferId?: unknown;
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as BillingSetupBody | null;
  const transferId = typeof body?.transferId === "string" ? body.transferId.trim() : "";
  if (!transferId) {
    return NextResponse.json({ error: "transferId required" }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 501 });
  }

  try {
    const [transfer] = await db
      .select()
      .from(workspaceOwnershipTransfer)
      .where(eq(workspaceOwnershipTransfer.id, transferId))
      .limit(1);
    if (!transfer || transfer.toUserId !== userId || transfer.status !== "pending") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!transfer.requiresBillingAcceptance) {
      return NextResponse.json({ ok: true, billingReady: true });
    }

    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name,
        stripeCustomerId: organization.stripeCustomerId,
      })
      .from(organization)
      .where(eq(organization.id, transfer.organizationId))
      .limit(1);
    if (!org) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const [recipient] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
    if (!recipient?.email) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const customerId = await ensureStripeCustomerForOrganization(stripe, org, recipient.email);
    const base = resolveTowerPublicBaseUrl();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${base}/team?ownershipTransferId=${encodeURIComponent(transferId)}`,
    });

    await db
      .update(workspaceOwnershipTransfer)
      .set({ stripeBillingReady: true })
      .where(eq(workspaceOwnershipTransfer.id, transferId));

    return NextResponse.json({ url: portal.url, billingReady: true });
  } catch (error) {
    const response = ownershipTransferErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }
}
