import { SheetBody, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Skeleton } from "@/shared/ui/skeleton";

type OperatorDetailSheetSkeletonProps = {
  title: string;
};

/** Screen-reader title when sheet content is not ready yet (e.g. before deferred loading UI). */
export function OperatorDetailSheetAccessibleTitle(props: OperatorDetailSheetSkeletonProps) {
  return (
    <SheetHeader>
      <SheetTitle className="sr-only">{props.title}</SheetTitle>
    </SheetHeader>
  );
}

export function OperatorDetailSheetSkeleton(props: OperatorDetailSheetSkeletonProps) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">{props.title}</SheetTitle>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </SheetHeader>
      <SheetBody className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </SheetBody>
    </>
  );
}
