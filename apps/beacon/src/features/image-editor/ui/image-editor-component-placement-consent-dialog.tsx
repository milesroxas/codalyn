import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

export type ComponentPlacementConsentRequest = {
  componentName: string;
  /** Page the placement check ran on — when the Designer moves to another page the dialog switches to scan mode. */
  pageId: string | null;
  /** A scan already ran on this page and found no instance (shown after a scan-mode miss). */
  scanFoundNothing: boolean;
};

export type ComponentPlacementSearchState = {
  /** false = scanning the page for the component, true = adding the approved copy to the page. */
  placing: boolean;
};

function PlacementSearchView(props: { placing: boolean; onCancel: () => void }) {
  const { placing, onCancel } = props;
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{placing ? "Adding component…" : "Scanning this page…"}</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div aria-live="polite" className="flex items-center gap-2">
            <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />
            <p>
              {placing
                ? "Beacon is adding the component to this page so you can configure this preset."
                : "Beacon is looking for the component this preset configures."}
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button type="button" variant="outline" disabled={placing} onClick={onCancel}>
          Cancel
        </Button>
      </AlertDialogFooter>
    </>
  );
}

function PlacementScanView(props: {
  componentName: string;
  scanPending: boolean;
  onConfirmPlacement: () => void;
  onScanPage: () => void;
  onCancel: () => void;
}) {
  const { componentName, scanPending, onConfirmPlacement, onScanPage, onCancel } = props;
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Scan this page for {componentName}?</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div aria-live="polite" className="grid gap-2">
            <p>
              You switched pages. Beacon will look for an existing{" "}
              <span className="font-medium text-foreground">{componentName}</span> here instead of adding a new one.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button type="button" variant="link" disabled={scanPending} onClick={onConfirmPlacement}>
          Add a copy here instead
        </Button>
        <AlertDialogCancel type="button" disabled={scanPending} onClick={onCancel}>
          Cancel
        </AlertDialogCancel>
        <Button type="button" disabled={scanPending} onClick={onScanPage}>
          {scanPending ? "Scanning…" : "Scan page"}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

function PlacementAddView(props: {
  componentName: string;
  scanFoundNothing: boolean;
  onConfirmPlacement: () => void;
  onCancel: () => void;
}) {
  const { componentName, scanFoundNothing, onConfirmPlacement, onCancel } = props;
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Add {componentName} to this page?</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div aria-live="polite" className="grid gap-2">
            {scanFoundNothing ? (
              <p className="font-medium text-foreground">No {componentName} found on this page.</p>
            ) : null}
            <p>
              <span className="font-medium text-foreground">{componentName}</span> isn’t on this page. Beacon will add a
              copy to the page body so you can configure this preset.
            </p>
            <p>
              When you finish, Beacon removes it automatically.{" "}
              <span className="font-medium text-foreground">
                If you close Beacon before finishing, the copy stays on the page
              </span>{" "}
              and you’ll need to delete it manually.
            </p>
            <p>
              Already using {componentName} on another page? Switch to it in the Designer and Beacon will scan that page
              instead.
            </p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel type="button" onClick={onCancel}>
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction type="button" onClick={onConfirmPlacement}>
          I understand, add it
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}

type ImageEditorComponentPlacementConsentDialogProps = {
  /** Non-null while Beacon scans for (or places) the preset's component; consent `request` takes precedence. */
  searching: ComponentPlacementSearchState | null;
  request: ComponentPlacementConsentRequest | null;
  currentPageId: string | null;
  scanPending: boolean;
  /** User confirmed Beacon may add a temporary copy of the component to the current page. */
  onConfirmPlacement: () => void;
  /** User switched pages and asked Beacon to look for an existing instance there. */
  onScanPage: () => void;
  onCancel: () => void;
};

/**
 * Preset-open flow dialog shown over the preset list: a searching state while Beacon scans the page,
 * then a consent gate before it places a temporary component instance. Reacts to Designer page changes
 * while open: on a different page it offers to scan for an existing instance instead of adding a new one.
 *
 * Close is driven only by explicit actions (never `onOpenChange`) so Radix's action-close cannot
 * cancel a flow the user just confirmed.
 */
export function ImageEditorComponentPlacementConsentDialog(props: ImageEditorComponentPlacementConsentDialogProps) {
  const { searching, request, currentPageId, scanPending, onConfirmPlacement, onScanPage, onCancel } = props;

  const isSearchView = request == null && searching != null;
  const isScanMode =
    request != null && request.pageId != null && currentPageId != null && currentPageId !== request.pageId;
  const canCancel = isSearchView ? !searching.placing : !scanPending;

  return (
    <AlertDialog open={searching != null || request != null}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (canCancel) {
            onCancel();
          }
        }}
      >
        {isSearchView ? (
          <PlacementSearchView placing={searching.placing} onCancel={onCancel} />
        ) : isScanMode ? (
          <PlacementScanView
            componentName={request.componentName}
            scanPending={scanPending}
            onConfirmPlacement={onConfirmPlacement}
            onScanPage={onScanPage}
            onCancel={onCancel}
          />
        ) : (
          <PlacementAddView
            componentName={request?.componentName ?? "this component"}
            scanFoundNothing={request?.scanFoundNothing === true}
            onConfirmPlacement={onConfirmPlacement}
            onCancel={onCancel}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
