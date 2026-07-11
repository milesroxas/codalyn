"use client";

import { ConsentBanner, ConsentDialog, ConsentManagerProvider } from "@c15t/nextjs";
import type { ReactNode } from "react";
import { TOWER_PRIVACY_PATH, TOWER_TERMS_PATH } from "@/shared/lib/navigation/tower-marketing-paths";

/**
 * c15t consent management in offline mode: decisions persist locally
 * (localStorage + cookie) with no consent backend. Switch `mode` to
 * "hosted" with a consent.io `backendURL` if durable audit records or
 * automatic jurisdiction detection become requirements.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  return (
    <ConsentManagerProvider
      options={{
        mode: "offline",
        consentCategories: ["necessary", "measurement"],
        legalLinks: {
          privacyPolicy: { href: TOWER_PRIVACY_PATH, target: "_self" },
          termsOfService: { href: TOWER_TERMS_PATH, target: "_self" },
        },
      }}
    >
      <ConsentBanner />
      <ConsentDialog />
      {children}
    </ConsentManagerProvider>
  );
}
