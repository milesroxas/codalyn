import { type ExportConstraints, readExportConstraints } from "@codalyn/webflow-kit";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { useCmsSlotsDrawerDismissBlocked } from "@/features/cms-slots/ui/cms-slots-route-interaction-context";
import { ImageEditor } from "@/features/image-editor/ui/image-editor";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import {
  CMS_SLOTS_COMPOSER_IMAGE_BLOCKED_HINT,
  CMS_SLOTS_COMPOSER_IMAGE_DRAWER_DESCRIPTION,
  CMS_SLOTS_COMPOSER_IMAGE_DRAWER_TITLE,
  CMS_SLOTS_COMPOSER_IMAGE_REMOVE_LABEL,
  CMS_SLOTS_COMPOSER_IMAGE_REPLACE_LABEL,
  CMS_SLOTS_COMPOSER_IMAGE_UPLOAD_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";
import {
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerNested,
  DrawerTitle,
  DrawerTrigger,
  drawerListSheetContentDefaults,
} from "@/shared/ui/drawer";
import { StatusMessage } from "@/shared/ui/status-message";

type CmsSlotImagePropFieldProps = {
  ep: ComposableInstancePropMeta;
  value: string;
  busy: boolean;
  onChange: (url: string) => void;
};

/** Stacked drawer hosting the shared {@link ImageEditor} in compose mode (locked to the Designer preset). */
function ComposeImageDrawer(props: {
  constraints: ExportConstraints;
  label: string;
  busy: boolean;
  onComplete: (url: string) => void;
  trigger: ReactNode;
}) {
  const { constraints, label, busy, onComplete, trigger } = props;
  const [open, setOpen] = useState(false);
  const dismissBlocked = useCmsSlotsDrawerDismissBlocked(busy);

  return (
    <DrawerNested open={open} onOpenChange={setOpen} interactionBlocked={dismissBlocked}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent {...drawerListSheetContentDefaults} maxHeight="tall" flushBottom>
        <DrawerHeader align="start">
          <DrawerTitle>{CMS_SLOTS_COMPOSER_IMAGE_DRAWER_TITLE}</DrawerTitle>
          {/* Kept for dialog a11y (aria-describedby) but visually hidden — the title + breadcrumbs carry the context. */}
          <DrawerDescription className="sr-only">
            {label} — {CMS_SLOTS_COMPOSER_IMAGE_DRAWER_DESCRIPTION}
          </DrawerDescription>
        </DrawerHeader>
        <ImageEditor
          composeSession={{
            constraints,
            onComplete: (asset) => {
              onComplete(asset.url);
              setOpen(false);
            },
            onCancel: () => setOpen(false),
          }}
        />
      </DrawerContent>
    </DrawerNested>
  );
}

/**
 * Composer control for upload-capable image props (`image | imageAsset | cmsImage | imageSet`). Replaces the
 * paste-URL input: open → drop/pick → confirm → inline thumbnail. The composed value remains a hosted URL string.
 *
 * - **Blocked** — Designer set no valid export constraints: disabled, with a hint.
 * - **Empty** — configured, no value: "Upload image" opens the compose drawer.
 * - **Filled** — value set: inline thumbnail (preset aspect) + Replace + Remove.
 */
export function CmsSlotImagePropField(props: CmsSlotImagePropFieldProps) {
  const { ep, value, busy, onChange } = props;
  const { settings } = useBeaconAppSettings();
  const constraints = readExportConstraints(ep.imageExport, { defaultQuality: settings.defaultExportQuality });
  const hasValue = value.trim() !== "";

  if (constraints == null) {
    return (
      <div className="space-y-1">
        <Button type="button" variant="outline" size="sm" disabled className="w-full justify-start">
          <ImagePlus data-icon="inline-start" aria-hidden strokeWidth={2.25} />
          {CMS_SLOTS_COMPOSER_IMAGE_UPLOAD_LABEL}
        </Button>
        <StatusMessage tone="warning" size="sm">
          {CMS_SLOTS_COMPOSER_IMAGE_BLOCKED_HINT}
        </StatusMessage>
      </div>
    );
  }

  const aspectRatio = `${constraints.width} / ${constraints.height}`;

  if (hasValue) {
    return (
      <div className="space-y-2">
        <div
          className="w-full max-w-48 overflow-hidden rounded-sm border border-input bg-muted"
          style={{ aspectRatio }}
        >
          <img src={value} alt={ep.label} className="size-full object-cover" />
        </div>
        <div className="flex gap-2">
          <ComposeImageDrawer
            constraints={constraints}
            label={ep.label}
            busy={busy}
            onComplete={onChange}
            trigger={
              <Button type="button" variant="outline" size="sm" disabled={busy}>
                <RefreshCw data-icon="inline-start" aria-hidden strokeWidth={2.25} />
                {CMS_SLOTS_COMPOSER_IMAGE_REPLACE_LABEL}
              </Button>
            }
          />
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onChange("")}>
            <Trash2 data-icon="inline-start" aria-hidden strokeWidth={2.25} />
            {CMS_SLOTS_COMPOSER_IMAGE_REMOVE_LABEL}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ComposeImageDrawer
      constraints={constraints}
      label={ep.label}
      busy={busy}
      onComplete={onChange}
      trigger={
        <Button type="button" variant="outline" size="sm" disabled={busy} className="w-full justify-start">
          <ImagePlus data-icon="inline-start" aria-hidden strokeWidth={2.25} />
          {CMS_SLOTS_COMPOSER_IMAGE_UPLOAD_LABEL}
        </Button>
      }
    />
  );
}
