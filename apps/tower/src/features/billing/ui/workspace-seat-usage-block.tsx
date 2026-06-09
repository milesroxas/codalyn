import {
  formatWorkspaceSeatUsageLabel,
  shouldShowWorkspaceSeatBillingBreakdown,
  type WorkspaceSeatUsage,
  workspacePaidSeatsAvailable,
  workspacePaidSeatsAvailableLabel,
  workspaceSeatBillingBreakdownLines,
} from "@/shared/lib/billing/workspace-seat-usage";
import { FormFieldHint } from "@/shared/ui/form-field";

export type WorkspaceSeatUsageBlockProps = {
  usage: Pick<
    WorkspaceSeatUsage,
    "seatsUsed" | "effectiveSeatLimit" | "stripeSeatQuantity" | "operatorSeatLimitOverride"
  >;
};

/** Canonical seat usage line + optional billed vs effective breakdown. */
export function WorkspaceSeatUsageBlock(props: WorkspaceSeatUsageBlockProps) {
  const { usage } = props;
  const breakdown = workspaceSeatBillingBreakdownLines(usage);
  const paidSeatsAvailableLabel = workspacePaidSeatsAvailableLabel(workspacePaidSeatsAvailable(usage));

  return (
    <div data-slot="workspace-seat-usage" className="space-y-1">
      <FormFieldHint size="md">{formatWorkspaceSeatUsageLabel(usage)}</FormFieldHint>
      {shouldShowWorkspaceSeatBillingBreakdown(usage) && breakdown ? (
        <FormFieldHint>
          {breakdown.billedLabel}; {breakdown.effectiveLabel}.
        </FormFieldHint>
      ) : null}
      {paidSeatsAvailableLabel ? <FormFieldHint>{paidSeatsAvailableLabel}</FormFieldHint> : null}
    </div>
  );
}
