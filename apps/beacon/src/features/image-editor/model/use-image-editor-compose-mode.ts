import type { ExportConstraints } from "@codalyn/webflow-kit";
import { useMemo } from "react";

/**
 * Optional drive for {@link ImageEditor} when it is embedded (e.g. the CMS slot Composer) instead of mounted on
 * the `/images` route. Presence of a session locks the editor to a Designer per-prop preset and a `compose`
 * placement that hands the uploaded asset back to the caller — no canvas/CMS mutation, no route navigation.
 */
export type ImageEditorComposeSession = {
  /**
   * Designer per-prop preset. Locks output dimensions and export format and hides the resolver/picker UI; quality is
   * seeded from the preset (the workspace default — the Designer form has no quality control) but stays adjustable per
   * upload, like the `/images` editor, so the composer can trim quality to satisfy the preset's max file size.
   */
  constraints: ExportConstraints;
  /** Fired on a successful `compose` upload with the new Webflow asset. */
  onComplete: (asset: { id: string; url: string }) => void;
  onCancel: () => void;
};

export type ImageEditorComposeMode = {
  active: boolean;
  constraints: ExportConstraints | null;
  onComplete: ((asset: { id: string; url: string }) => void) | null;
  onCancel: (() => void) | null;
};

/**
 * Normalizes the optional compose session into stable flags/handlers. Keeping the branching here keeps the
 * 1.6k-line {@link ImageEditor} body's complexity flat — callers read plain properties.
 */
export function useImageEditorComposeMode(
  composeSession: ImageEditorComposeSession | null | undefined
): ImageEditorComposeMode {
  const active = composeSession != null;
  const constraints = composeSession?.constraints ?? null;
  const onComplete = composeSession?.onComplete ?? null;
  const onCancel = composeSession?.onCancel ?? null;
  return useMemo(() => ({ active, constraints, onComplete, onCancel }), [active, constraints, onComplete, onCancel]);
}
