import { IconCreditCard } from "@tabler/icons-react";

export type OperatorStripeBillingMetaProps = {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export function OperatorStripeBillingMeta(props: OperatorStripeBillingMetaProps) {
  const { stripeCustomerId, stripeSubscriptionId } = props;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <IconCreditCard className="size-3.5" />
      <span>
        Stripe customer: <code className="font-mono">{stripeCustomerId ?? "—"}</code>
      </span>
      <span>
        Sub: <code className="font-mono">{stripeSubscriptionId ?? "—"}</code>
      </span>
    </div>
  );
}
