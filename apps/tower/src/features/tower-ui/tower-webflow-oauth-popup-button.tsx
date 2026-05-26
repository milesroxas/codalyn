"use client";

import type { VariantProps } from "class-variance-authority";
import { type ReactNode, useState } from "react";
import { useTowerWebflowOAuthPopup } from "@/features/tower-ui/use-tower-webflow-oauth-popup";
import { Button, type buttonVariants } from "@/shared/ui/button";

type OAuthButtonProps = VariantProps<typeof buttonVariants> & {
  children: ReactNode;
  onSuccess?: () => void;
};

export function TowerWebflowOAuthPopupButton({
  children,
  variant = "default",
  size = "sm",
  onSuccess,
}: OAuthButtonProps) {
  const [busy, setBusy] = useState(false);
  const { openPopup } = useTowerWebflowOAuthPopup(onSuccess);

  async function handleClick() {
    setBusy(true);
    try {
      await openPopup();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size={size} variant={variant} disabled={busy} type="button" onClick={() => void handleClick()}>
      {children}
    </Button>
  );
}
