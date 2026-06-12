import type { OperatorUserBillingMode } from "@/server/operator/types";

export function operatorUserBillingModeDescription(mode: OperatorUserBillingMode): string {
  switch (mode) {
    case "free":
      return "No individual Stripe subscription. Pro or Studio limits apply via workspace Team billing or operator usage overrides.";
    case "stripe_individual":
      return "Individual Pro or Studio plan billed through Stripe. Plan and subscription status sync from webhooks.";
  }
}
