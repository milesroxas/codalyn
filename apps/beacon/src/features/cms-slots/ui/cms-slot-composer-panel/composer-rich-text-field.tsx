import { lazy, Suspense } from "react";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { Textarea } from "@/shared/ui/textarea";

// Lazy so Lexical code-splits out of the main Composer chunk and only loads when a rich-text field opens (plan §12).
const RichTextEditor = lazy(() => import("@/shared/ui/rich-text-editor").then((m) => ({ default: m.RichTextEditor })));

type ComposerRichTextFieldProps = {
  inputId: string;
  ep: ComposableInstancePropMeta;
  value: string;
  busy: boolean;
  onChange: (v: string) => void;
};

/**
 * Composer adapter for a Webflow `richText` prop: wraps the shared rich-text primitive with the Composer's contract
 * (`value`/`onChange` are HTML). The primitive emits `""` for empty documents, so `onChange` flows straight into
 * `onChangePropValue` exactly as the Textarea did — no draft-shape change. Sanitization happens at the model boundary
 * (plan §9). A disabled Textarea is shown while the editor chunk loads.
 */
export function ComposerRichTextField({
  inputId,
  ep,
  value,
  busy,
  onChange,
}: ComposerRichTextFieldProps): React.JSX.Element {
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
