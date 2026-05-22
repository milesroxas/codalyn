import { TeamWorkspacePanelSkeletonContent } from "@/features/team/ui/team-workspace-panel-skeleton";
import { PageHeaderSkeleton } from "@/shared/ui/page-header-skeleton";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";

function TeamDashboardSkeleton() {
  return (
    <SkeletonStatus label="Loading team dashboard">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-col gap-6 border-b border-border pb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <PageHeaderSkeleton descriptionLines={2} />
            <Skeleton className="h-8 w-16 shrink-0" />
          </div>
        </header>
        <TeamWorkspacePanelSkeletonContent />
      </main>
    </SkeletonStatus>
  );
}

export { TeamDashboardSkeleton };
