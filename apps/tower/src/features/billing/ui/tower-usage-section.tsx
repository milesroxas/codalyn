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
  title?: string;
  description?: string;
};

export function TowerUsageSection(props: TowerUsageSectionProps) {
  const {
    status,
    billingEnabled = false,
    showBillingLink = false,
    title = "Monthly usage",
    description = "Beacon and Tower API traffic for your signed-in account. Limits reset on the first day of each UTC month.",
  } = props;

  const resetLine = towerUsageLimitResetDetailLine();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">UTC {status.yearMonth}</Badge>
            <Badge variant="secondary">{status.tier === "pro" ? "Pro" : "Free"}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.metered || status.meters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {status.tier === "pro" ? "No usage limits on the Pro plan." : "No usage limits on the Free plan."}
          </p>
        ) : (
          status.meters.map((meter) => <UsageMeterRow key={meter.kind} meter={meter} />)
        )}
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
