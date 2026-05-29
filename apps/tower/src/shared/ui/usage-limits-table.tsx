"use client";

import {
  buildTowerUsageFeatureGroups,
  type TowerUsageLimitsKind,
  type TowerUsageMeterSnapshot,
  towerUsageLimitResetDetailLine,
} from "@codalyn/webflow-kit";
import { IconInfinity } from "@tabler/icons-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { UsageLimitsHeaderMeta } from "@/shared/ui/usage-limits-reset-label";
import { UsageMeterLabel } from "@/shared/ui/usage-meter-label";

type UsageLimitsTableProps = {
  title?: string;
  tierLabel: string;
  limitsKind: TowerUsageLimitsKind;
  limitsKindBadge?: string | null;
  limitsKindDetail?: string | null;
  meters: readonly TowerUsageMeterSnapshot[];
};

function formatMonthlyLimitValue(limit: number | null): string {
  if (limit === null) {
    return "Unlimited";
  }
  return limit.toLocaleString();
}

function UsageLimitsUnmeteredNotice() {
  return (
    <Alert variant="info">
      <IconInfinity aria-hidden />
      <AlertTitle>Unmetered</AlertTitle>
      <AlertDescription>Monthly usage limits are not applied to this account.</AlertDescription>
    </Alert>
  );
}

export function UsageLimitsTable(props: UsageLimitsTableProps) {
  const {
    title = "Monthly usage limits",
    tierLabel,
    limitsKind,
    limitsKindBadge = null,
    limitsKindDetail = null,
    meters,
  } = props;

  const resetLine = towerUsageLimitResetDetailLine();

  return (
    <Accordion type="single" collapsible defaultValue="monthly-limits">
      <AccordionItem value="monthly-limits" className="border-none">
        <AccordionTrigger>
          <span className="flex min-w-0 items-center gap-3">
            <span className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </span>
            <UsageLimitsHeaderMeta resetLine={resetLine}>
              <Badge variant="secondary">{tierLabel}</Badge>
              {limitsKindBadge ? <Badge variant="outline">{limitsKindBadge}</Badge> : null}
            </UsageLimitsHeaderMeta>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3">
          {limitsKindDetail ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{limitsKindDetail}</p>
          ) : null}

          {limitsKind === "unmetered" ? (
            <UsageLimitsUnmeteredNotice />
          ) : (
            <div className="space-y-4">
              {buildTowerUsageFeatureGroups(meters).map((group) => (
                <div key={group.feature} className="space-y-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{group.label}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity</TableHead>
                          <TableHead className="text-right">Monthly limit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.meters.map((meter) => (
                          <TableRow key={meter.kind}>
                            <TableCell>
                              <UsageMeterLabel kind={meter.kind} />
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatMonthlyLimitValue(meter.limit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
