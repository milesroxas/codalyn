import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $createParagraphNode, $isElementNode, type ElementNode, type LexicalEditor, type LexicalNode } from "lexical";

/**
 * HTML ↔ Lexical adapters over `@lexical/html`. Both must run inside the matching Lexical context:
 * {@link htmlToLexicalNodes} inside `editor.update(...)` (it mints nodes), {@link lexicalToHtml} inside
 * `editorState.read(...)`. The registered node set on the editor is the import allowlist — Lexical silently drops
 * any DOM element it has no node for, which is the first line of sanitization defense (plan §6.3, §11).
 */

/** Parse an HTML string into Lexical nodes. Empty/non-string input yields no nodes. Call inside `editor.update`. */
export function htmlToLexicalNodes(editor: LexicalEditor, html: string): LexicalNode[] {
  const source = typeof html === "string" ? html : "";
  if (source.trim().length === 0) {
    return [];
  }
  const dom = new DOMParser().parseFromString(source, "text/html");
  return $generateNodesFromDOM(editor, dom);
}

/** Serialize the whole editor document to an HTML string. Call inside `editorState.read`. */
export function lexicalToHtml(editor: LexicalEditor): string {
  return $generateHtmlFromNodes(editor, null);
}

/**
 * Appends imported nodes under `root`, wrapping loose inline nodes (bare text, links, line breaks — e.g. a legacy
 * plain-text value, or `<a>` at top level) into paragraphs so the root only ever holds block-level children, which
 * Lexical requires. Whitespace-only top-level text between blocks is dropped to avoid spurious empty paragraphs.
 * Guarantees at least one paragraph so the editor is never childless. Call inside `editor.update`.
 */
export function appendHtmlNodesToRoot(root: ElementNode, nodes: readonly LexicalNode[]): void {
  let paragraph: ElementNode | null = null;
  for (const node of nodes) {
    const isBlock = $isElementNode(node) && !node.isInline();
    if (isBlock) {
      paragraph = null;
      root.append(node);
      continue;
    }
    if (paragraph == null) {
      // Skip whitespace-only loose text that sits between block elements (source-formatting newlines).
      if (node.getTextContent().trim().length === 0 && !$isElementNode(node)) {
        continue;
      }
      paragraph = $createParagraphNode();
      root.append(paragraph);
    }
    paragraph.append(node);
  }
  if (root.getChildrenSize() === 0) {
    root.append($createParagraphNode());
  }
}
