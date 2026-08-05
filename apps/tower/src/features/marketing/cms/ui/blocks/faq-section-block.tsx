import type { FaqSectionBlock as FaqSectionBlockProps } from "@/payload-types";

/**
 * Split FAQ per the Paper "Pricing" design: eyebrow + statement in a left
 * lane, hairline-separated question/answer list on the right.
 */
function FaqSectionBlock({ eyebrow, heading, items }: FaqSectionBlockProps) {
  return (
    <section data-slot="cms-faq-section" className="flex flex-col gap-10 py-16 lg:flex-row lg:gap-16">
      <header className="flex shrink-0 flex-col gap-3 lg:w-[352px]">
        {eyebrow ? <p className="text-sm font-semibold tracking-[0.07em] uppercase">{eyebrow}</p> : null}
        <h2 className="text-4xl leading-[42px] font-semibold tracking-tight text-balance">{heading}</h2>
      </header>
      <dl className="flex flex-1 flex-col">
        {items.map((item, index) => (
          <div
            key={item.id ?? item.question}
            className={
              index < items.length - 1
                ? "flex flex-col gap-2 border-b py-6 first:pt-0"
                : "flex flex-col gap-2 py-6 pb-0"
            }
          >
            <dt className="font-semibold">{item.question}</dt>
            <dd className="text-[15px] leading-6 text-muted-foreground">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export { FaqSectionBlock };
