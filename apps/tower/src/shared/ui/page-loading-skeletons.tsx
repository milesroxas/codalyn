import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";

function AcceptInvitationSkeleton() {
  return (
    <SkeletonStatus label="Loading invitation">
      <main className="mx-auto max-w-sm px-6 py-8">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-5/6" />
        <div className="mt-6 flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </main>
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
