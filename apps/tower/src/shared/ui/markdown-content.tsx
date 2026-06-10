import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/shared/lib/utils";

const markdownContentVariants = cva("text-sm leading-relaxed text-foreground", {
  variants: {
    density: {
      default: "space-y-4",
      compact: "space-y-3",
    },
  },
  defaultVariants: {
    density: "default",
  },
});

type MarkdownContentProps = {
  content: string;
  className?: string;
} & VariantProps<typeof markdownContentVariants>;

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mt-10 scroll-mt-24 border-b border-border pb-2 text-xl font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-8 scroll-mt-24 text-base font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-6 scroll-mt-24 text-sm font-semibold tracking-tight first:mt-0">{children}</h4>
  ),
  p: ({ children }) => <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
  a: ({ href, children }) => {
    const childText = typeof children === "string" ? children : undefined;
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className="font-medium text-primary underline-offset-4 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {childText ?? children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-4 text-sm italic text-muted-foreground">{children}</blockquote>
  ),
  hr: () => <hr className="my-8 border-border" />,
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-3 text-xs font-medium tracking-wide text-foreground uppercase">{children}</th>
  ),
  td: ({ children }) => <td className="px-4 py-3 align-top text-muted-foreground">{children}</td>,
  code: ({ children }) => (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>
  ),
};

function MarkdownContent({ content, className, density }: MarkdownContentProps) {
  return (
    <article className={cn(markdownContentVariants({ density }), className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </article>
  );
}

export { MarkdownContent, markdownContentVariants };
