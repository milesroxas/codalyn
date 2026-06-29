"use client";

import { type ImageExportFormat, resolveBeaconPresetPreviewLayout } from "@codalyn/webflow-kit";
import { IconPhoto } from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

const placeholderCanvasVariants = cva(
  "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/30",
  {
    variants: {
      density: {
        default: "min-h-28 p-4",
        compact: "min-h-16 p-2.5",
      },
    },
    defaultVariants: {
      density: "default",
    },
  }
);

const placeholderAssetVariants = cva(
  "relative max-w-full overflow-hidden rounded-md border border-dashed border-border/80 bg-card/90 shadow-sm ring-1 ring-foreground/5",
  {
    variants: {
      density: {
        default: "",
        compact: "",
      },
    },
    defaultVariants: {
      density: "default",
    },
  }
);

const placeholderAssetContentVariants = cva("absolute inset-0 flex flex-col items-center justify-center gap-1", {
  variants: {
    density: {
      default: "p-2",
      compact: "p-1.5",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

const placeholderIconVariants = cva("text-muted-foreground/70", {
  variants: {
    density: {
      default: "size-5",
      compact: "size-4",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

const placeholderDimensionsVariants = cva("font-mono font-medium text-foreground tabular-nums", {
  variants: {
    density: {
      default: "text-[11px]",
      compact: "text-[10px]",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

export function BeaconPresetExportPlaceholder(
  props: {
    width: number;
    height: number;
    exportFormat?: ImageExportFormat;
    defaultExportFormat?: ImageExportFormat;
    className?: string;
  } & VariantProps<typeof placeholderCanvasVariants>
) {
  const { width, height, exportFormat, defaultExportFormat, className, density = "default" } = props;
  const layout = resolveBeaconPresetPreviewLayout({ width, height });
  const formatLabel = (exportFormat ?? defaultExportFormat ?? "webp").toUpperCase();
  const maxAssetHeight = density === "compact" ? "4rem" : "5.5rem";

  return (
    <div
      className={cn(placeholderCanvasVariants({ density }), className)}
      role="img"
      aria-label={`Export preview ${layout.dimensionsLabel}, ${formatLabel}`}
    >
      <div
        className={placeholderAssetVariants({ density })}
        style={{
          aspectRatio: layout.aspectRatio,
          height: maxAssetHeight,
          width: "auto",
          maxWidth: "100%",
        }}
      >
        <div className={placeholderAssetContentVariants({ density })}>
          <IconPhoto className={placeholderIconVariants({ density })} aria-hidden stroke={1.5} />
          <span className={placeholderDimensionsVariants({ density })}>{layout.dimensionsLabel}</span>
        </div>
      </div>
      <Badge variant="secondary" className="absolute top-2 right-2 font-mono text-[10px] uppercase tracking-wide">
        {formatLabel}
      </Badge>
    </div>
  );
}
