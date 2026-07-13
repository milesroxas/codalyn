import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText } from "@payloadcms/richtext-lexical/react";

import { cn } from "@/shared/lib/utils";

type RichTextContentProps = {
  data: SerializedEditorState;
  className?: string;
};

/**
 * Lexical rich text renderer styled to match `MarkdownContent` (legal/marketing prose).
 * Owns all CMS prose styling — do not restyle at call sites.
 */
function RichTextContent({ data, className }: RichTextContentProps) {
  return (
    <RichText
      data={data}
      className={cn(
        "space-y-4 text-sm leading-relaxed text-foreground",
        "[&_h1]:mt-10 [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight first:[&_h1]:mt-0",
        "[&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight first:[&_h2]:mt-0",
        "[&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:tracking-tight first:[&_h3]:mt-0",
        "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground",
        "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:text-muted-foreground",
        "[&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:text-sm [&_ol]:text-muted-foreground",
        "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-muted-foreground",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
        "[&_img]:max-w-full [&_img]:rounded-md",
        className
      )}
    />
  );
}

export { RichTextContent };
