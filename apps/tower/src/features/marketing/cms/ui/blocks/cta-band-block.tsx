import Link from "next/link";

import type { CtaBandBlock as CtaBandBlockProps } from "@/payload-types";
import { Button } from "@/shared/ui/button";

/**
 * Closing CTA band per the Paper "Pricing" design: hairline-topped centered
 * statement, supporting line, and up to two pill actions.
 */
function CtaBandBlock({ heading, subheading, actions }: CtaBandBlockProps) {
  return (
    <section data-slot="cms-cta-band" className="flex flex-col items-center gap-6 border-t py-20 text-center">
      <h2 className="text-4xl leading-[42px] font-semibold tracking-tight text-balance">{heading}</h2>
      {subheading ? <p className="max-w-[520px] text-muted-foreground">{subheading}</p> : null}
      {actions?.length ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) => (
            <Button
              key={action.id ?? `${action.label}-${action.href}`}
              asChild
              size="lg"
              variant={action.appearance === "secondary" ? "outline" : "default"}
              className="rounded-full"
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export { CtaBandBlock };
