import type { TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { UsageContributionBreakdown } from "@/features/billing/ui/usage-contribution-breakdown";
import { WorkspaceUsageContributorsTable } from "@/features/billing/ui/workspace-usage-contributors";
import type { WorkspaceUsageContributor } from "@/server/billing/workspace-usage-contributors";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { TowerPageSection } from "@/shared/ui/tower-page-shell";

type UsageBreakdownSectionProps = {
  status: TowerUsageStatusSnapshot;
  /** Per-member contributors for a paid Team workspace when the viewer can manage billing; otherwise null. */
  contributors: WorkspaceUsageContributor[] | null;
};

export function UsageBreakdownSection({ status, contributors }: UsageBreakdownSectionProps) {
  const pooled = status.usageScope === "workspace";
  const drivingDescription = pooled
    ? "Share of this workspace's pooled usage by activity this month."
    : "Share of your usage by activity this month.";

  return (
    <TowerPageSection
      title="Usage breakdown"
      description="What is contributing to this month's usage, and on Team, who."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What's driving usage</CardTitle>
            <CardDescription>{drivingDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <UsageContributionBreakdown status={status} />
          </CardContent>
        </Card>

        {contributors ? (
          <Card>
            <CardHeader>
              <CardTitle>By member</CardTitle>
              <CardDescription>Who on this workspace is contributing to the shared pool this month.</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkspaceUsageContributorsTable contributors={contributors} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </TowerPageSection>
  );
}
