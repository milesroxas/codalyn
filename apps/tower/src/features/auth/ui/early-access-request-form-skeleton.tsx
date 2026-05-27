import { EarlyAccessPageShell } from "@/features/tower-ui/early-access-page-shell";
import { FormFieldSkeleton } from "@/shared/ui/form-field-skeleton";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";

function EarlyAccessRequestFormSkeleton() {
  return (
    <SkeletonStatus label="Loading request access form" className="w-full space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-5/6 max-w-sm" />
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-lg shadow-black/4 dark:shadow-black/25">
        <div className="flex flex-col gap-5">
          <FormFieldSkeleton fieldSize="lg" />
          <FormFieldSkeleton fieldSize="lg" />
          <FormFieldSkeleton fieldSize="lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      <Skeleton className="h-4 w-52" />
    </SkeletonStatus>
  );
}

function EarlyAccessRequestFormSkeletonPage() {
  return (
    <EarlyAccessPageShell>
      <EarlyAccessRequestFormSkeleton />
    </EarlyAccessPageShell>
  );
}

export { EarlyAccessRequestFormSkeleton, EarlyAccessRequestFormSkeletonPage };
