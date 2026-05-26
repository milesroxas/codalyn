import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { towerUsageLimitResetDetailLine } from "@codalyn/webflow-kit";
import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { UsageMeterRow } from "@/shared/ui/usage-meter-row";

type TowerUsageSectionProps = {
  status: TowerUsageStatusSnapshot;
  billingEnabled?: boolean;
  showBillingLink?: boolean;
  fillHeight?: boolean;
  title?: string;
  description?: string;
};

export function TowerUsageSection(props: TowerUsageSectionProps) {
  const {
    status,
    billingEnabled = false,
    showBillingLink = false,
    fillHeight = false,
    title = "Monthly usage",
    description = "Beacon and Tower API traffic for your signed-in account. Limits reset on the first day of each month.",
  } = props;

  const resetLine = towerUsageLimitResetDetailLine();

  return (
    <Card layout={fillHeight ? "fill" : "default"}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{status.tier === "pro" ? "Pro" : "Free"}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.meters.map((meter) => (
          <UsageMeterRow key={meter.kind} meter={meter} />
        ))}
        <p className="text-xs text-muted-foreground">Resets {resetLine}</p>
      </CardContent>
      {showBillingLink && billingEnabled && status.tier === "free" ? (
        <CardFooter className="justify-end border-t border-border">
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing">Manage billing</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
