import { SquareCheck } from "lucide-react";

import type { FeatureStripBlock as FeatureStripBlockProps } from "@/payload-types";

/**
 * Reassurance strip per the Paper "Pricing" design: bold claim + supporting
 * line on the left, checked items filling the remaining row on a raised
 * hairline-bordered surface.
 */
function FeatureStripBlock({ heading, subheading, items }: FeatureStripBlockProps) {
  return (
    <section
      data-slot="cms-feature-strip"
      className="flex flex-col gap-6 rounded-2xl border bg-card p-8 lg:flex-row lg:items-center lg:gap-8"
    >
      <div className="flex shrink-0 flex-col gap-1.5 lg:w-80">
        <p className="font-semibold">{heading}</p>
        {subheading ? <p className="text-sm text-muted-foreground">{subheading}</p> : null}
      </div>
      <ul className="flex flex-1 flex-col gap-4 sm:flex-row sm:gap-6">
        {items.map((item) => (
          <li key={item.id ?? item.text} className="flex flex-1 items-center gap-3 text-sm">
            <SquareCheck aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            {item.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

export { FeatureStripBlock };
