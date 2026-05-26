"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";

export type AuthCheckEmailCardCopy = {
  title: string;
  description: string;
  resendLabel: string;
  resendPendingLabel: string;
  resendSuccess: string;
  footerLabel: string;
};

type AuthCheckEmailCardProps = {
  email: string;
  copy: AuthCheckEmailCardCopy;
  footerHref: string;
  onResend: () => Promise<{ error?: string | null }>;
};

export function AuthCheckEmailCard({ email, copy, footerHref, onResend }: AuthCheckEmailCardProps) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = useCallback(async () => {
    setPending(true);
    const { error } = await onResend();
    setPending(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
    toast.success(copy.resendSuccess);
  }, [copy.resendSuccess, onResend]);

  return (
    <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">{copy.title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <p className="text-sm text-muted-foreground">
          Sent to <span className="font-medium text-foreground">{email}</span>
        </p>
        {sent ? (
          <p className="text-sm text-muted-foreground" role="status">
            {copy.resendSuccess}
          </p>
        ) : null}
        <Button type="button" size="form" width="full" disabled={pending} onClick={() => void handleResend()}>
          {pending ? copy.resendPendingLabel : copy.resendLabel}
        </Button>
      </CardContent>
      <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
        <p className="text-left text-sm text-muted-foreground">
          <Link href={footerHref} className="font-medium text-foreground underline-offset-4 hover:underline">
            {copy.footerLabel}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
