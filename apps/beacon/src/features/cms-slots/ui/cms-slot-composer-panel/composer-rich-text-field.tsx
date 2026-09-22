import { lazy, Suspense } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { Textarea } from "@/shared/ui/textarea";

/**
 * Lazy so Lexical code-splits out of the main Composer chunk and only loads when a rich-text field opens (plan §12),
 * and conditional so it does not ship at all when the editor is flag-gated off: with
 * `__BEACON_RICH_TEXT_EDITOR_ENABLED__` false the ternary folds to `null` at build time and Rollup drops the whole
 * `import()` — the Lexical chunk, and with it its `MutationObserver`, is absent from Marketplace
 * artifacts (App Review Preflight "Silent Canvas Mutations"; see shared/lib/beacon-release-flags.ts).
 */
const RichTextEditor = __BEACON_RICH_TEXT_EDITOR_ENABLED__
  ? lazy(() => import("@/shared/ui/rich-text-editor").then((m) => ({ default: m.RichTextEditor })))
  : null;

type ComposerRichTextFieldProps = {
  inputId: string;
  ep: ComposableInstancePropMeta;
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
  /**
   * Whether this build bundles the rich-text editor (WYSIWYG vs. editing the HTML directly).
   * Defaults to the build constant; stories and tests pass it explicitly to cover both states.
   */
  richTextEditorAvailable?: boolean;
};

/**
 * Composer adapter for a Webflow `richText` prop: wraps the shared rich-text primitive with the Composer's contract
 * (`value`/`onChange` are HTML). The primitive emits `""` for empty documents, so `onChange` flows straight into
 * `onChangePropValue` exactly as the Textarea did — no draft-shape change. Sanitization happens at the model boundary
 * (plan §9). A disabled Textarea is shown while the editor chunk loads.
 *
 * Reduced form (every Marketplace bundle): the same HTML is edited directly in an editable multiline Textarea, which
 * is what this field was before commit `11baf76`. The contract is unchanged — `value`/`onChange` are still the prop's
 * HTML string and the model boundary still sanitizes it — so the only difference is that the user types markup
 * instead of formatting it.
 */
export function ComposerRichTextField({
  inputId,
  ep,
  value,
  busy,
  onChange,
  richTextEditorAvailable = __BEACON_RICH_TEXT_EDITOR_ENABLED__,
}: ComposerRichTextFieldProps): React.JSX.Element {
  if (!richTextEditorAvailable || RichTextEditor === null) {
    return (
      <Textarea
        id={inputId}
        aria-label={ep.label}
        className="min-h-16 max-h-40 resize-y text-sm"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <Suspense
      fallback={<Textarea disabled value={value} aria-label={ep.label} className="min-h-16 max-h-40 text-sm" />}
    >
      <RichTextEditor
        id={inputId}
        aria-label={ep.label}
        value={value}
        disabled={busy}
        variant="compact"
        onChange={onChange}
      />
    </Suspense>
  );
}
