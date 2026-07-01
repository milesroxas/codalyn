"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/shared/lib/utils";
import { HtmlValuePlugin } from "@/shared/ui/rich-text-editor/plugins/html-value-plugin";
import { RichTextLinkPlugin } from "@/shared/ui/rich-text-editor/plugins/link-plugin";
import {
  DEFAULT_RICH_TEXT_FEATURES,
  RICH_TEXT_NODES,
  RICH_TEXT_THEME,
  type RichTextConfig,
} from "@/shared/ui/rich-text-editor/rich-text-editor-config";
import { RichTextToolbar } from "@/shared/ui/rich-text-editor/rich-text-editor-toolbar";

const richTextEditorVariants = cva(
  // Matches Input/Textarea surface: input border, focus ring driven by focus-within (the caret lives in a child).
  "rounded-sm border border-input bg-transparent text-sm text-foreground shadow-sm transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40 has-disabled:cursor-not-allowed has-disabled:opacity-60 dark:bg-input/30",
  {
    variants: {
      variant: {
        default: "",
        compact: "",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const richTextContentVariants = cva(
  "relative w-full resize-y overflow-auto leading-snug outline-none [&_a]:cursor-pointer",
  {
    variants: {
      variant: {
        default: "max-h-72 min-h-24 px-3 py-2",
        compact: "max-h-40 min-h-16 px-2.5 py-1.5",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export type RichTextEditorProps = VariantProps<typeof richTextEditorVariants> & {
  /** Controlled HTML value (source of truth). */
  value: string;
  /** Emits HTML on change (debounced); empty documents collapse to `""`. Sanitized at the model boundary (plan §9). */
  onChange: (html: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  config?: RichTextConfig;
  className?: string;
  "aria-label"?: string;
  id?: string;
};

/** Toggles Lexical editability when `disabled` changes (initialConfig.editable is read only once on mount). */
function EditablePlugin({ disabled }: { disabled: boolean }): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(!disabled);
  }, [editor, disabled]);
  return null;
}

/**
 * Reusable, feature-agnostic rich-text editor built on Lexical (plan §6). Controlled via an HTML `value`/`onChange`
 * pair; serializes to/from an HTML string over the registered node allowlist. This is the owning primitive — consumers
 * use its props/variants and do not restyle it at the call site (CLAUDE.md UI Styling Ownership Rule).
 */
export function RichTextEditor({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = "Write…",
  config,
  variant,
  className,
  id,
  "aria-label": ariaLabel,
}: RichTextEditorProps): React.JSX.Element {
  const features = config?.features ?? DEFAULT_RICH_TEXT_FEATURES;

  // initialConfig must be stable so LexicalComposer is not re-initialized per render (plan §12). The live `disabled`
  // is applied reactively by EditablePlugin; here we only seed the mount value from a ref so no reactive prop is read.
  const initialDisabledRef = useRef(disabled);
  const initialConfig = useMemo(
    () => ({
      namespace: "BeaconRichText",
      theme: RICH_TEXT_THEME,
      nodes: [...RICH_TEXT_NODES],
      editable: !initialDisabledRef.current,
      onError: (error: Error) => {
        throw error;
      },
    }),
    []
  );

  return (
    <div data-slot="rich-text-editor" className={cn(richTextEditorVariants({ variant }), className)}>
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextToolbar features={features} disabled={disabled} />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                id={id}
                aria-label={ariaLabel}
                data-slot="rich-text-content"
                className={cn(richTextContentVariants({ variant }), disabled ? "cursor-not-allowed" : "cursor-text")}
                onBlur={onBlur}
              />
            }
            placeholder={
              <div
                className={cn(
                  richTextContentVariants({ variant }),
                  "pointer-events-none absolute inset-0 text-muted-foreground"
                )}
              >
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <RichTextLinkPlugin />
        <HtmlValuePlugin value={value} onChange={onChange} />
        <EditablePlugin disabled={disabled} />
      </LexicalComposer>
    </div>
  );
}
