import * as Sentry from "@sentry/nextjs";
import type Stripe from "stripe";
import { isTowerBillingEnabled } from "@/server/billing/billing-feature";
import { getStripe } from "@/server/billing/stripe-client";
import { applyStripeWebhookEvent } from "@/server/billing/stripe-webhook-apply";

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim();

export async function POST(request: Request) {
  if (!isTowerBillingEnabled()) {
    return Response.json({ received: true, billing: "disabled" });
  }
  if (!WEBHOOK_SECRET) {
    return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 501 });
  }
  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ error: "STRIPE_SECRET_KEY is not set" }, { status: 501 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await applyStripeWebhookEvent(stripe, event);
  } catch (e) {
    Sentry.captureException(e, {
      tags: { area: "stripe-webhook" },
      extra: { eventId: event.id, eventType: event.type },
    });
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
