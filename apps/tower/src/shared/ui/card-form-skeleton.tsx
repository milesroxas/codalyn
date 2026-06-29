import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardFooter, CardHeader } from "@/shared/ui/card";
import { FormFieldSkeleton } from "@/shared/ui/form-field-skeleton";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";

type CardFormFieldConfig = {
  fieldSize?: "sm" | "default" | "lg";
  multiline?: boolean;
  hint?: boolean;
  labelWidth?: string;
};

type CardFormSkeletonProps = {
  label: string;
  titleWidth?: string;
  descriptionLines?: 0 | 1 | 2;
  fields?: CardFormFieldConfig[];
  footer?: boolean;
  footerWidth?: string;
  submit?: boolean;
};

function CardFormSkeleton({
  label,
  titleWidth = "w-36",
  descriptionLines = 1,
  fields = [{ fieldSize: "lg" }, { fieldSize: "lg" }],
  footer = true,
  footerWidth = "w-48",
  submit = true,
}: CardFormSkeletonProps) {
  return (
    <SkeletonStatus label={label}>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <Skeleton className={cn("h-6", titleWidth)} />
          {descriptionLines >= 1 ? <Skeleton className="h-4 w-full max-w-sm" /> : null}
          {descriptionLines >= 2 ? <Skeleton className="h-4 w-5/6 max-w-xs" /> : null}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-5">
            {fields.map((field, index) => (
              <FormFieldSkeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton fields
                key={index}
                fieldSize={field.fieldSize}
                multiline={field.multiline}
                hint={field.hint}
                labelWidth={field.labelWidth}
              />
            ))}
            {submit ? <Skeleton className="h-10 w-full rounded-sm" /> : null}
          </div>
        </CardContent>
        {footer ? (
          <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
            <Skeleton className={cn("h-4", footerWidth)} />
          </CardFooter>
        ) : null}
      </Card>
    </SkeletonStatus>
  );
}

export { type CardFormFieldConfig, CardFormSkeleton };
