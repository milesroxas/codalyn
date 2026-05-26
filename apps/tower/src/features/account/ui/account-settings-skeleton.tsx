import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { FormFieldGrid } from "@/shared/ui/form-field";
import { FormFieldSkeleton } from "@/shared/ui/form-field-skeleton";
import { PageHeaderSkeleton } from "@/shared/ui/page-header-skeleton";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";
import { TowerPageMain } from "@/shared/ui/tower-page-shell";

function AccountSettingsSkeleton() {
  return (
    <SkeletonStatus label="Loading account settings">
      <TowerPageMain width="narrow">
        <header className="mb-8 flex flex-col gap-6 border-b border-border pb-8">
          <PageHeaderSkeleton />
        </header>
        <div className="space-y-8">
          <SettingsCardSkeleton fields={2} />
          <SettingsCardSkeleton fields={1} />
          <SettingsCardSkeleton fields={3} />
          <SettingsCardSkeleton fields={2} destructive />
        </div>
      </TowerPageMain>
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
        {props.fields === 2 ? (
          <FormFieldGrid>
            {Array.from({ length: props.fields }).map((_, index) => (
              <FormFieldSkeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton fields
                key={index}
              />
            ))}
          </FormFieldGrid>
        ) : (
          <div className="flex flex-col gap-4">
            {Array.from({ length: props.fields }).map((_, index) => (
              <FormFieldSkeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton fields
                key={index}
              />
            ))}
          </div>
        )}
        <Skeleton className={props.destructive ? "mt-6 h-8 w-32" : "mt-6 h-8 w-28"} />
      </CardContent>
    </Card>
  );
}

export { AccountSettingsSkeleton };
