import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { Klass, LexicalNode } from "lexical";

/** Toolbar feature ids; the array passed in `RichTextConfig.features` is also the toolbar display order. */
export type RichTextFeature =
  | "bold"
  | "italic"
  | "underline"
  | "h2"
  | "h3"
  | "bulletList"
  | "orderedList"
  | "link"
  | "quote"
  | "clear";

export type RichTextConfig = {
  /** Toolbar feature allowlist, in display order. Defaults to {@link DEFAULT_RICH_TEXT_FEATURES}. */
  features?: RichTextFeature[];
  /** Cap matching the bound Webflow field, if known. Reserved for a future counter (plan §16). */
  maxLength?: number;
};

export const DEFAULT_RICH_TEXT_FEATURES: readonly RichTextFeature[] = [
  "bold",
  "italic",
  "underline",
  "h2",
  "h3",
  "bulletList",
  "orderedList",
  "link",
  "quote",
  "clear",
];

/**
 * The registered node set **is** the import allowlist (plan §6.3): Lexical drops any DOM element it has no node for
 * during HTML import, the first sanitization layer. Paragraph/text/linebreak are built in.
 */
export const RICH_TEXT_NODES: ReadonlyArray<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
];

/**
 * Maps Lexical node types to classes so the editor preview roughly matches the published `.w-richtext` output.
 * Output HTML still uses semantic tags (`<strong>`, `<em>`, `<u>`, `<h2>`, `<ul>`, `<a>`, `<blockquote>`); Webflow
 * styles those on the live site.
 */
export const RICH_TEXT_THEME = {
  paragraph: "mb-2 last:mb-0",
  heading: {
    h2: "mt-2 mb-1 text-base font-semibold",
    h3: "mt-2 mb-1 text-sm font-semibold",
  },
  quote: "my-2 border-l-2 border-border pl-3 text-muted-foreground italic",
  list: {
    ul: "mb-2 list-disc pl-5",
    ol: "mb-2 list-decimal pl-5",
    listitem: "mb-0.5",
    nested: { listitem: "list-none" },
  },
  link: "text-primary underline underline-offset-2",
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline underline-offset-2",
  },
} as const;
