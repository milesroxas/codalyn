import type { CompareTableBlock as CompareTableBlockProps } from "@/payload-types";
import { cn } from "@/shared/lib/utils";

/**
 * Fixed-lane plan comparison per the Paper "Pricing" design: a wide label lane
 * plus one lane per plan column, hairline-separated rows, and a muted footnote.
 * Wide content scrolls horizontally inside the section on small screens.
 */
function CompareTableBlock({ columns, rows, footnote }: CompareTableBlockProps) {
  return (
    <section data-slot="cms-compare-table" className="flex flex-col gap-4 overflow-x-auto">
      <div className="min-w-[840px]">
        <div className="flex border-b pb-4">
          <div className="w-[29%] shrink-0" />
          {columns.map((column) => (
            <p
              key={column.id ?? column.label}
              className={cn("w-[17.75%] shrink-0 text-sm font-semibold", column.accent && "text-[#EC4899]")}
            >
              {column.label}
            </p>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.id ?? row.label} className="flex items-center border-b py-4">
            <p className="w-[29%] shrink-0 text-sm font-medium">{row.label}</p>
            {columns.map((column, columnIndex) => {
              const cell = row.cells[columnIndex];
              return (
                <p
                  key={column.id ?? column.label}
                  className={cn(
                    "w-[17.75%] shrink-0 pr-4 text-sm",
                    cell?.muted ? "text-muted-foreground/70" : "text-foreground/90"
                  )}
                >
                  {cell?.value ?? ""}
                </p>
              );
            })}
          </div>
        ))}
      </div>
      {footnote ? <p className="max-w-3xl text-[13px] leading-relaxed text-muted-foreground">{footnote}</p> : null}
    </section>
  );
}

export { CompareTableBlock };
