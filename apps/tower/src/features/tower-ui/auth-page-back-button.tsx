import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";

type AuthPageBackButtonProps = {
  href?: string;
  label?: string;
};

export function AuthPageBackButton({ href = "/", label = "Back" }: AuthPageBackButtonProps) {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground">
      <Link href={href}>
        <IconChevronLeft aria-hidden className="size-4" stroke={1.5} />
        {label}
      </Link>
    </Button>
  );
}
