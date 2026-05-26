import { PageHeaderSkeleton } from "@/shared/ui/page-header-skeleton";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";
import { TowerPageMain } from "@/shared/ui/tower-page-shell";

function BeaconPageSkeleton() {
  return (
    <SkeletonStatus label="Loading Beacon settings">
      <TowerPageMain>
        <PageHeaderSkeleton descriptionLines={2} />
        <div className="mt-8 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </TowerPageMain>
    </SkeletonStatus>
  );
}

export { BeaconPageSkeleton };
