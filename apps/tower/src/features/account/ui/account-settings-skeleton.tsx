import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { FormFieldSkeleton } from "@/shared/ui/form-field-skeleton";
import { PageHeaderSkeleton } from "@/shared/ui/page-header-skeleton";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";

function AccountSettingsSkeleton() {
  return (
    <SkeletonStatus label="Loading account settings">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        <PageHeaderSkeleton />
        <Separator className="my-8" />
        <div className="space-y-8">
          <SettingsCardSkeleton fields={2} />
          <SettingsCardSkeleton fields={1} />
          <SettingsCardSkeleton fields={3} />
          <SettingsCardSkeleton fields={2} destructive />
        </div>
      </main>
    </SkeletonStatus>
  );
}

function SettingsCardSkeleton(props: { fields: number; destructive?: boolean }) {
  return (
    <Card className="border-border/80">
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </CardHeader>
      <CardContent>
        <div className={props.fields === 2 ? "grid gap-4 sm:grid-cols-2" : "flex flex-col gap-4"}>
          {Array.from({ length: props.fields }).map((_, index) => (
            <FormFieldSkeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton fields
              key={index}
              fieldSize="lg"
            />
          ))}
        </div>
        <Skeleton className={props.destructive ? "mt-6 h-9 w-32" : "mt-6 h-9 w-28"} />
      </CardContent>
    </Card>
  );
}

export { AccountSettingsSkeleton };
