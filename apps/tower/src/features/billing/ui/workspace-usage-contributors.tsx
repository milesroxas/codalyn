import type { WorkspaceUsageContributor } from "@/server/billing/workspace-usage-contributors";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { UsageMeterLabel } from "@/shared/ui/usage-meter-label";

type WorkspaceUsageContributorsTableProps = {
  contributors: WorkspaceUsageContributor[];
};

function contributorDisplayName(contributor: WorkspaceUsageContributor): string {
  return contributor.name ?? contributor.email ?? "Member";
}

/** Per-member contribution to the pooled Team usage this month (Team admin billing view). */
export function WorkspaceUsageContributorsTable({ contributors }: WorkspaceUsageContributorsTableProps) {
  if (contributors.length === 0) {
    return <p className="text-sm text-muted-foreground">No workspace members to attribute usage to yet.</p>;
  }

  const anyUsage = contributors.some(
    (contributor) => contributor.webflowProxyRequestCount + contributor.imageOptimizeCount > 0
  );

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">
                <UsageMeterLabel kind="webflowProxy" />
              </TableHead>
              <TableHead className="text-right">
                <UsageMeterLabel kind="image" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contributors.map((contributor) => {
              const name = contributorDisplayName(contributor);
              const showEmail = contributor.name != null && contributor.email != null;
              return (
                <TableRow key={contributor.userId}>
                  <TableCell>
                    <span className="font-medium text-foreground">{name}</span>
                    {showEmail ? (
                      <span className="block text-xs text-muted-foreground">{contributor.email}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {contributor.webflowProxyRequestCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {contributor.imageOptimizeCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {anyUsage ? null : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Per-member contributions accrue from new pooled usage going forward; activity before this was tracked only as
          a workspace total.
        </p>
      )}
    </div>
  );
}
