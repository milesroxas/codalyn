import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

type OperatorPendingReviewAlertProps = {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
};

export function OperatorPendingReviewAlert({
  icon,
  title,
  description,
  href,
  actionLabel,
}: OperatorPendingReviewAlertProps) {
  return (
    <Alert variant="warning">
      {icon}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {href && actionLabel ? (
        <AlertAction>
          <Button variant="outline" size="sm" asChild>
            <Link href={href}>{actionLabel}</Link>
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}
