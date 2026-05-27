import { Search } from "lucide-react";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";

const searchInputRootClass = "relative";
const searchInputIconClass =
  "pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground";
const searchInputFieldClass = "h-9 pl-9";

function SearchInput({ className, type = "search", ...props }: React.ComponentProps<typeof Input>) {
  return (
    <div data-slot="search-input" className={searchInputRootClass}>
      <Search className={searchInputIconClass} aria-hidden />
      <Input type={type} className={cn(searchInputFieldClass, className)} {...props} />
    </div>
  );
}

export { SearchInput };
