import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";

const sectionLabelDividerLineVariants = cva("h-px min-w-0 flex-1", {
  variants: {
    tone: {
      muted: "bg-border/60",
      default: "bg-border",
    },
  },
  defaultVariants: {
    tone: "muted",
  },
});

const sectionLabelDividerLabelVariants = cva("shrink-0 text-xs font-medium text-muted-foreground", {
  variants: {
    variant: {
      pill: "rounded-full bg-muted px-3 py-1",
      plain: "text-center",
    },
  },
  defaultVariants: {
    variant: "pill",
  },
});

type SectionLabelDividerProps = {
  label: string;
  className?: string;
  lineTone?: VariantProps<typeof sectionLabelDividerLineVariants>["tone"];
} & VariantProps<typeof sectionLabelDividerLabelVariants>;

export function SectionLabelDivider(props: SectionLabelDividerProps) {
  const { label, className, variant = "pill", lineTone = variant === "pill" ? "muted" : "default" } = props;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={sectionLabelDividerLineVariants({ tone: lineTone })} aria-hidden />
      <span className={sectionLabelDividerLabelVariants({ variant })}>{label}</span>
      <div className={sectionLabelDividerLineVariants({ tone: lineTone })} aria-hidden />
    </div>
  );
}
