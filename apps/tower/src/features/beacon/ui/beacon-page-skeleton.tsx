import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { PageHeaderSkeleton } from "@/shared/ui/page-header-skeleton";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";
import { TowerPageMain } from "@/shared/ui/tower-page-shell";

function BeaconEditorExperienceSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-full max-w-md" />
      </CardHeader>
      <CardContent className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </CardContent>
    </Card>
  );
}

function BeaconPageSkeleton() {
  return (
    <SkeletonStatus label="Loading Beacon settings">
      <TowerPageMain>
        <header className="mb-8 flex flex-col gap-6 border-b border-border pb-8">
          <PageHeaderSkeleton descriptionLines={2} />
        </header>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </TowerPageMain>
    </SkeletonStatus>
  );
}

export { BeaconEditorExperienceSkeleton, BeaconPageSkeleton };
