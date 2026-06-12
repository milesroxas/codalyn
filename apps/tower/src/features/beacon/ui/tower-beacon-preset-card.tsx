"use client";

import type { BeaconPresetRow, ImageExportFormat, PresetCrudScope } from "@codalyn/webflow-kit";
import { formatBeaconPresetStorageSummary, labelForPresetCrudScope } from "@codalyn/webflow-kit";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { BeaconPresetExportPlaceholder } from "@/features/beacon/ui/beacon-preset-export-placeholder";
import { dedupeBeaconPresetLabel } from "@/features/beacon/ui/tower-beacon-preset-list";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardFooter } from "@/shared/ui/card";

const presetCardVariants = cva("overflow-hidden py-0 ring-1 ring-foreground/10", {
  variants: {
    density: {
      default: "gap-0",
      compact: "gap-0",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

const presetCardBodyVariants = cva("space-y-2", {
  variants: {
    density: {
      default: "px-4 pb-3 pt-3",
      compact: "px-3 pb-2 pt-2",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

const presetCardTitleVariants = cva("font-medium leading-snug text-foreground", {
  variants: {
    density: {
      default: "text-sm",
      compact: "text-xs",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

export type TowerBeaconPresetCardProps = {
  row: BeaconPresetRow;
  scope: PresetCrudScope;
  displayName: string;
  defaultExportFormat?: ImageExportFormat;
  canEdit?: boolean;
  onEdit?: () => void;
  footer?: ReactNode;
} & VariantProps<typeof presetCardVariants>;

export function TowerBeaconPresetCard(props: TowerBeaconPresetCardProps) {
  const { row, scope, displayName, defaultExportFormat, canEdit = false, onEdit, footer, density = "default" } = props;
  const title = dedupeBeaconPresetLabel(displayName);
  const summary = formatBeaconPresetStorageSummary(row, defaultExportFormat);

  return (
    <Card size="sm" className={presetCardVariants({ density })}>
      <BeaconPresetExportPlaceholder
        width={row.width}
        height={row.height}
        exportFormat={row.exportFormat}
        defaultExportFormat={defaultExportFormat}
        density={density}
        className="rounded-none border-0 border-b border-border/60"
      />
      <CardContent className={presetCardBodyVariants({ density })}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className={presetCardTitleVariants({ density })}>{title}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{summary}</p>
          </div>
          <Badge variant="outline" className="shrink-0 font-normal">
            {labelForPresetCrudScope(scope)}
          </Badge>
        </div>
      </CardContent>
      {canEdit && onEdit ? (
        <CardFooter className="border-t border-border/60 px-4 py-2">
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onEdit}>
            Edit preset
          </Button>
        </CardFooter>
      ) : null}
      {footer}
    </Card>
  );
}
