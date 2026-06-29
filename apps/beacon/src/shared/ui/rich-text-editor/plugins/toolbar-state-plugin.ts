import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type RangeSelection,
  SELECTION_CHANGE_COMMAND,
  type TextFormatType,
} from "lexical";
import { useEffect, useState } from "react";

export type RichTextBlockType = "paragraph" | "h2" | "h3" | "quote" | "bullet" | "number";

export type ToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  blockType: RichTextBlockType;
  isLink: boolean;
  /** Current href when the selection sits inside a link, else `""`. */
  linkUrl: string;
  /** False when nothing is editable/selected (e.g. editor blurred with no range). */
  canEdit: boolean;
};

const EMPTY_STATE: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  blockType: "paragraph",
  isLink: false,
  linkUrl: "",
  canEdit: false,
};

/** The link node closest to the selection's anchor (anchor itself or its parent), or null. */
function selectedLinkNode(selection: RangeSelection) {
  const node = selection.anchor.getNode();
  if ($isLinkNode(node)) {
    return node;
  }
  const parent = node.getParent();
  return $isLinkNode(parent) ? parent : null;
}

function readToolbarState(): ToolbarState {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return EMPTY_STATE;
  }
  const anchorNode = selection.anchor.getNode();
  const element = anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow();

  let blockType: RichTextBlockType = "paragraph";
  const listNode = $getNearestNodeOfType(anchorNode, ListNode);
  if (listNode != null) {
    blockType = listNode.getListType() === "number" ? "number" : "bullet";
  } else if ($isHeadingNode(element)) {
    const tag = element.getTag();
    blockType = tag === "h3" ? "h3" : "h2";
  } else if ($isQuoteNode(element)) {
    blockType = "quote";
  }

  const link = selectedLinkNode(selection);
  return {
    bold: selection.hasFormat("bold"),
    italic: selection.hasFormat("italic"),
    underline: selection.hasFormat("underline"),
    blockType,
    isLink: link != null,
    linkUrl: link != null ? link.getURL() : "",
    canEdit: true,
  };
}

/**
 * Subscribes to selection/content changes and reflects the active inline formats + block type + link state — the
 * single source of truth for the toolbar's pressed state (plan §6.4). Call inside a `LexicalComposer`.
 */
export function useToolbarState(): ToolbarState {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState<ToolbarState>(EMPTY_STATE);

  useEffect(() => {
    const sync = () => {
      editor.getEditorState().read(() => setState(readToolbarState()));
    };
    sync();
    return mergeRegister(
      editor.registerUpdateListener(sync),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          sync();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor]);

  return state;
}

const INLINE_FORMATS: readonly TextFormatType[] = ["bold", "italic", "underline"];

/** Toolbar command helpers. Each toggles relative to the current selection; block toggles flip back to paragraph. */
export const richTextCommands = {
  toggleInline(editor: LexicalEditor, format: TextFormatType): void {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  },
  toggleHeading(editor: LexicalEditor, tag: "h2" | "h3", active: boolean): void {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => (active ? $createParagraphNode() : $createHeadingNode(tag)));
      }
    });
  },
  toggleQuote(editor: LexicalEditor, active: boolean): void {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => (active ? $createParagraphNode() : $createQuoteNode()));
      }
    });
  },
  toggleBulletList(editor: LexicalEditor, active: boolean): void {
    editor.dispatchCommand(active ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND, undefined);
  },
  toggleOrderedList(editor: LexicalEditor, active: boolean): void {
    editor.dispatchCommand(active ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined);
  },
  setLink(editor: LexicalEditor, url: string | null): void {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  },
  clearFormatting(editor: LexicalEditor): void {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }
      for (const format of INLINE_FORMATS) {
        if (selection.hasFormat(format)) {
          selection.formatText(format);
        }
      }
      for (const node of selection.getNodes()) {
        if ($isTextNode(node)) {
          node.setFormat(0);
        }
      }
      $setBlocksType(selection, () => $createParagraphNode());
    });
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
  },
};

/** Convenience: `editor` from context for components that issue commands. */
export function useRichTextEditor(): LexicalEditor {
  const [editor] = useLexicalComposerContext();
  return editor;
}
