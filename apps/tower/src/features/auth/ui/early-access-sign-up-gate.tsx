"use client";

import Link from "next/link";
import { AuthShell } from "@/features/tower-ui/auth-shell";
import {
  EARLY_ACCESS_ALREADY_APPROVED_PROMPT,
  EARLY_ACCESS_REQUEST_SIGN_IN_LABEL,
  EARLY_ACCESS_SIGN_UP_BLOCKED_MESSAGE,
} from "@/shared/lib/access/early-access-copy";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";

export function EarlyAccessSignUpGate(props: { signInHref: string; requestAccessHref?: string }) {
  const requestHref = props.requestAccessHref ?? "/request-access";
  return (
    <AuthShell>
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">Early access only</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {EARLY_ACCESS_SIGN_UP_BLOCKED_MESSAGE}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            If you received a team invitation, use that email and link when creating your account.
          </p>
          <Button asChild size="form" width="full">
            <Link href={requestHref}>Request early access</Link>
          </Button>
        </CardContent>
        <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
          <p className="text-left text-sm text-muted-foreground">
            {EARLY_ACCESS_ALREADY_APPROVED_PROMPT}{" "}
            <Link href={props.signInHref} className="font-medium text-foreground underline-offset-4 hover:underline">
              {EARLY_ACCESS_REQUEST_SIGN_IN_LABEL}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
