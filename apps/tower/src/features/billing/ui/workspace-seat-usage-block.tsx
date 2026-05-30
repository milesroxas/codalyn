import {
  formatWorkspaceSeatUsageLabel,
  shouldShowWorkspaceSeatBillingBreakdown,
  type WorkspaceSeatUsage,
  workspaceSeatBillingBreakdownLines,
} from "@/shared/lib/billing/workspace-seat-usage";

export type WorkspaceSeatUsageBlockProps = {
  usage: Pick<
    WorkspaceSeatUsage,
    "seatsUsed" | "effectiveSeatLimit" | "stripeSeatQuantity" | "operatorSeatLimitOverride"
  >;
  className?: string;
};

/** Canonical seat usage line + optional billed vs effective breakdown. */
export function WorkspaceSeatUsageBlock(props: WorkspaceSeatUsageBlockProps) {
  const { usage, className } = props;
  const breakdown = workspaceSeatBillingBreakdownLines(usage);

  return (
    <div className={className ?? "space-y-1"}>
      <p className="text-sm text-muted-foreground">{formatWorkspaceSeatUsageLabel(usage)}</p>
      {shouldShowWorkspaceSeatBillingBreakdown(usage) && breakdown ? (
        <p className="text-xs text-muted-foreground">
          {breakdown.billedLabel}; {breakdown.effectiveLabel}.
        </p>
      ) : null}
    </div>
  );
}
