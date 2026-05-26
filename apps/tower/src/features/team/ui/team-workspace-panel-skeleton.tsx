import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";

function TeamWorkspacePanelSkeletonContent() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-full max-w-xs" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
              key={index}
              className="flex items-center gap-3"
            >
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TeamWorkspacePanelSkeleton() {
  return (
    <SkeletonStatus label="Loading workspace">
      <TeamWorkspacePanelSkeletonContent />
    </SkeletonStatus>
  );
}

export { TeamWorkspacePanelSkeleton, TeamWorkspacePanelSkeletonContent };
