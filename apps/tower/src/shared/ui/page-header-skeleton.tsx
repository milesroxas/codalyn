import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

type PageHeaderSkeletonProps = {
  descriptionLines?: 0 | 1 | 2;
  className?: string;
};

function PageHeaderSkeleton({ descriptionLines = 1, className }: PageHeaderSkeletonProps) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <Skeleton className="h-8 w-40" />
      {descriptionLines >= 1 ? <Skeleton className="h-4 w-full max-w-md" /> : null}
      {descriptionLines >= 2 ? <Skeleton className="h-4 w-5/6 max-w-sm" /> : null}
    </div>
  );
}

export { PageHeaderSkeleton };
