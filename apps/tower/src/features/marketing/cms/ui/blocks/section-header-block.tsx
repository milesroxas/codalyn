import type { SectionHeaderBlock as SectionHeaderBlockProps } from "@/payload-types";

/**
 * Top-level section header per the Paper "Block / Section Header" design:
 * uppercase eyebrow (full-contrast, semibold, wide tracking) over a large
 * regular-weight statement capped at ~576px and balanced across lines.
 */
function SectionHeaderBlock({ eyebrow, heading }: SectionHeaderBlockProps) {
  return (
    <header data-slot="cms-section-header" className="flex flex-col items-start gap-3 pt-16">
      {eyebrow ? <p className="text-sm font-semibold tracking-[0.07em] uppercase">{eyebrow}</p> : null}
      <h2 className="max-w-xl text-4xl leading-[42px] font-normal text-balance">{heading}</h2>
    </header>
  );
}

export { SectionHeaderBlock };
