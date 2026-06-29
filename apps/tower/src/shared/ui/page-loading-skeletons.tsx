import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";

function AcceptInvitationSkeleton() {
  return (
    <SkeletonStatus label="Loading invitation">
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Skeleton className="h-10 w-full rounded-sm" />
          <Skeleton className="h-10 w-full rounded-sm" />
        </CardContent>
        <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
          <Skeleton className="h-4 w-48" />
        </CardFooter>
      </Card>
    </SkeletonStatus>
  );
}

function CompactRedirectSkeleton() {
  return (
    <SkeletonStatus label="Loading">
      <main className="p-6">
        <Skeleton className="h-4 w-56" />
      </main>
    </SkeletonStatus>
  );
}

function OperatorGateSkeleton() {
  return (
    <SkeletonStatus
      label="Loading operator console"
      className="flex min-h-dvh items-center justify-center bg-background"
    >
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </SkeletonStatus>
  );
}

export { AcceptInvitationSkeleton, CompactRedirectSkeleton, OperatorGateSkeleton };
