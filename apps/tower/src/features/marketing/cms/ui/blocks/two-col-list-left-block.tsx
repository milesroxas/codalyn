import type { TwoColListLeftBlock as TwoColListLeftBlockProps } from "@/payload-types";

/**
 * Left-aligned columns of labeled single-line items, per the Paper
 * "Block / 2 col list left" design: bold muted label over regular muted rows.
 */
function TwoColListLeftBlock({ columns }: TwoColListLeftBlockProps) {
  return (
    <div data-slot="cms-two-col-list-left" className="flex flex-col gap-10 sm:flex-row sm:gap-32">
      {columns.map((column) => (
        <div key={column.id ?? column.label} className="flex flex-col gap-4">
          <p className="text-sm leading-6 font-bold text-muted-foreground">{column.label}</p>
          <ul className="flex flex-col gap-4">
            {column.items.map((item) => (
              <li key={item.id ?? item.text} className="text-lg leading-6 text-foreground">
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export { TwoColListLeftBlock };
