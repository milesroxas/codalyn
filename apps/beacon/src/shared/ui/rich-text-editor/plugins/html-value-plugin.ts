import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, BLUR_COMMAND, COMMAND_PRIORITY_LOW } from "lexical";
import { useEffect, useRef } from "react";
import { isRichTextHtmlEmpty } from "@/shared/ui/rich-text-editor/lib/rich-text-empty";
import {
  appendHtmlNodesToRoot,
  htmlToLexicalNodes,
  lexicalToHtml,
} from "@/shared/ui/rich-text-editor/lib/rich-text-html";

type HtmlValuePluginProps = {
  /** Controlled HTML value (the source of truth). */
  value: string;
  /** Emits HTML on edit (debounced); empty documents normalize to `""`. */
  onChange: (html: string) => void;
  /** Debounce window for `onChange` (ms). Blur flushes immediately. */
  debounceMs?: number;
};

/**
 * Bridges a controlled HTML `value`/`onChange` pair onto a Lexical editor:
 *
 * - **Import** runs when an *external* `value` differs from what we last synced — the import update is flagged so its
 *   own update-listener tick does not echo back out as an `onChange`, and the cursor is left untouched while the user
 *   is mid-edit (an echo of our own emit, or an empty value while the editor is already empty, is a no-op).
 * - **Emit** serializes the document on content edits (selection-only ticks are ignored), debounced; an empty
 *   document collapses to `""` so the model boundary / conditional visibility agree on emptiness (plan §8).
 * - **Blur** flushes any pending emit synchronously.
 *
 * `lastSyncedRef` holds the last value we read *or* wrote, so a parent that stores exactly what we emit never triggers
 * a re-import that would reset the caret (plan §6.2, §12).
 */
export function HtmlValuePlugin({ value, onChange, debounceMs = 250 }: HtmlValuePluginProps): null {
  const [editor] = useLexicalComposerContext();
  const lastSyncedRef = useRef<string>("");
  const importingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Import the external value into the editor when it is genuinely new.
  useEffect(() => {
    if (value === lastSyncedRef.current) {
      return;
    }
    const editorEmpty = editor.getEditorState().read(() => $getRoot().getTextContent().trim().length === 0);
    if (isRichTextHtmlEmpty(value) && editorEmpty) {
      lastSyncedRef.current = value;
      return;
    }
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    importingRef.current = true;
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        appendHtmlNodesToRoot(root, htmlToLexicalNodes(editor, value));
      },
      {
        onUpdate: () => {
          importingRef.current = false;
        },
      }
    );
    lastSyncedRef.current = value;
  }, [value, editor]);

  // Emit serialized HTML on content edits (debounced).
  useEffect(() => {
    const flush = (editorState: ReturnType<typeof editor.getEditorState>) => {
      const html = editorState.read(() => lexicalToHtml(editor));
      const next = isRichTextHtmlEmpty(html) ? "" : html;
      if (next === lastSyncedRef.current) {
        return;
      }
      lastSyncedRef.current = next;
      onChangeRef.current(next);
    };

    const unregisterUpdate = editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (importingRef.current) {
        return;
      }
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return; // selection-only change — nothing to serialize
      }
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        flush(editorState);
      }, debounceMs);
    });

    const unregisterBlur = editor.registerCommand(
      BLUR_COMMAND,
      () => {
        if (timerRef.current != null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        flush(editor.getEditorState());
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      unregisterUpdate();
      unregisterBlur();
    };
  }, [editor, debounceMs]);

  return null;
}
