import { TOWER_USAGE_LIMIT_RESET_LABEL } from "@codalyn/webflow-kit";
import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

const usageLimitsResetLabelVariants = cva("whitespace-nowrap text-xs text-muted-foreground");

type UsageLimitsResetLabelProps = {
  resetLine: string;
};

export function UsageLimitsResetLabel(props: UsageLimitsResetLabelProps) {
  const { resetLine } = props;

  return (
    <p data-slot="usage-limits-reset-label" className={usageLimitsResetLabelVariants()}>
      {TOWER_USAGE_LIMIT_RESET_LABEL} {resetLine}
    </p>
  );
}

const usageLimitsHeaderMetaVariants = cva("flex flex-wrap items-center gap-2");

type UsageLimitsHeaderMetaProps = {
  resetLine: string;
  children: ReactNode;
};

export function UsageLimitsHeaderMeta(props: UsageLimitsHeaderMetaProps) {
  const { resetLine, children } = props;

  return (
    <div data-slot="usage-limits-header-meta" className={usageLimitsHeaderMetaVariants()}>
      <UsageLimitsResetLabel resetLine={resetLine} />
      {children}
    </div>
  );
}
