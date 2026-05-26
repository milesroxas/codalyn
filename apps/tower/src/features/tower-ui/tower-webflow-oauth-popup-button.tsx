"use client";

import type { VariantProps } from "class-variance-authority";
import { type ReactNode, useState } from "react";
import { Button, type buttonVariants } from "@/shared/ui/button";

const WEBFLOW_OAUTH_POPUP_FEATURES = "popup=yes,width=480,height=700,scrollbars=yes,resizable=yes";

type OAuthButtonProps = VariantProps<typeof buttonVariants> & {
  children: ReactNode;
};

export function TowerWebflowOAuthPopupButton({ children, variant = "outline", size = "sm" }: OAuthButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/webflow/authorize", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        return;
      }
      window.open(data.url, "tower-webflow-oauth", WEBFLOW_OAUTH_POPUP_FEATURES);
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
