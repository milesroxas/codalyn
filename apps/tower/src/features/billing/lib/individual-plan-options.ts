import type { TowerIndividualPlanKey } from "@codalyn/webflow-kit";
import type { IndividualPaidPlan } from "@/server/billing/stripe-subscription-status";

/**
 * Row models for the individual-plan ladder on the /billing page.
 *
 * The ladder always renders every visible plan (Free → Pro → Studio) so subscribed users keep a
 * clear path down as well as up: `subscribe` starts Stripe Checkout (no active subscription),
 * `switch` deep-links the Stripe portal subscription-update flow (Pro ↔ Studio), and `cancel`
 * deep-links the portal cancel flow (back to Free at period end). Switching plans through
 * Checkout is intentionally not modeled — the checkout route rejects users with an active
 * subscription, so paid-plan changes must go through the portal.
 */
export type IndividualPlanOptionAction =
  | { kind: "subscribe"; plan: IndividualPaidPlan }
  | { kind: "switch"; plan: IndividualPaidPlan }
  | { kind: "cancel" };

export type IndividualPlanOptionModel = {
  key: TowerIndividualPlanKey;
  state: "current" | "upgrade" | "downgrade";
  action: IndividualPlanOptionAction | null;
};

export type IndividualPlanOptionsInput = {
  /** Active individual paid plan, or null when on Free. */
  individualPlan: IndividualPaidPlan | null;
  /** Pro checkout is configured (STRIPE_PRICE_PRO set). */
  proCheckoutAvailable: boolean;
  /** Studio checkout is configured (STRIPE_PRICE_STUDIO set). */
  studioCheckoutAvailable: boolean;
  /** The user has a Stripe customer, so portal flows (cancel/switch) can be opened. */
  portalAvailable: boolean;
  /** The active subscription is already set to cancel, so offer no further plan actions. */
  cancelPending: boolean;
};

const PLAN_LADDER: readonly TowerIndividualPlanKey[] = ["free", "pro", "studio"];

function paidPlanConfigured(plan: IndividualPaidPlan, input: IndividualPlanOptionsInput): boolean {
  return plan === "pro" ? input.proCheckoutAvailable : input.studioCheckoutAvailable;
}

function paidPlanAction(
  plan: IndividualPaidPlan,
  input: IndividualPlanOptionsInput
): IndividualPlanOptionAction | null {
  if (!paidPlanConfigured(plan, input)) {
    return null;
  }
  if (input.individualPlan === null) {
    return { kind: "subscribe", plan };
  }
  if (input.cancelPending || !input.portalAvailable) {
    return null;
  }
  return { kind: "switch", plan };
}

/**
 * Builds the full plan ladder for the individual subscription card.
 *
 * A paid plan that is not the current plan is hidden when its Stripe price is not configured —
 * there is no action to offer and rendering a dead row is worse than omitting it. Free and the
 * current plan are always visible.
 */
export function buildIndividualPlanOptions(input: IndividualPlanOptionsInput): IndividualPlanOptionModel[] {
  const currentPlan: TowerIndividualPlanKey = input.individualPlan ?? "free";

  const options: IndividualPlanOptionModel[] = [];
  for (const key of PLAN_LADDER) {
    if (key === currentPlan) {
      options.push({ key, state: "current", action: null });
      continue;
    }

    if (key === "free") {
      const canCancel = input.portalAvailable && !input.cancelPending;
      options.push({ key, state: "downgrade", action: canCancel ? { kind: "cancel" } : null });
      continue;
    }

    if (!paidPlanConfigured(key, input)) {
      continue;
    }
    const state = PLAN_LADDER.indexOf(key) > PLAN_LADDER.indexOf(currentPlan) ? "upgrade" : "downgrade";
    options.push({ key, state, action: paidPlanAction(key, input) });
  }
  return options;
}
