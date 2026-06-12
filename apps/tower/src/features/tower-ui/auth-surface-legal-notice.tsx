import Link from "next/link";

import { AUTH_SURFACE_LEGAL_NOTICE_PREFIX } from "@/features/auth/lib/auth-surface-copy";
import { TOWER_PRIVACY_PATH, TOWER_TERMS_PATH } from "@/shared/lib/navigation/tower-marketing-paths";

type AuthSurfaceLegalNoticeVariant = keyof typeof AUTH_SURFACE_LEGAL_NOTICE_PREFIX;

type AuthSurfaceLegalNoticeProps = {
  variant?: AuthSurfaceLegalNoticeVariant;
};

export function AuthSurfaceLegalNotice({ variant = "generic" }: AuthSurfaceLegalNoticeProps) {
  return (
    <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
      {AUTH_SURFACE_LEGAL_NOTICE_PREFIX[variant]}
      <Link href={TOWER_TERMS_PATH} className="underline underline-offset-2 hover:text-foreground">
        Terms
      </Link>
      {" and "}
      <Link href={TOWER_PRIVACY_PATH} className="underline underline-offset-2 hover:text-foreground">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
