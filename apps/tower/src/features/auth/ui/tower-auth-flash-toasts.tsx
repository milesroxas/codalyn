"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  EMAIL_VERIFICATION_FAILED_TOAST,
  EMAIL_VERIFIED_TOAST,
  readEmailVerificationRedirectError,
  TOWER_EMAIL_VERIFIED_QUERY,
} from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";
import { TOWER_AUTH_FLASH_EMAIL_VERIFIED, type TowerAuthFlash } from "@/shared/lib/auth/tower-auth-flash";

type TowerAuthFlashToastsProps = {
  flash: TowerAuthFlash | null;
};

function TowerAuthFlashToastsInner({ flash }: TowerAuthFlashToastsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notifiedRef = useRef(false);
  const { refetch } = authClient.useSession();

  useEffect(() => {
    if (notifiedRef.current) {
      return;
    }

    const verificationError = readEmailVerificationRedirectError(searchParams);
    const legacyVerified = searchParams.has(TOWER_EMAIL_VERIFIED_QUERY);
    const cookieVerified = flash === TOWER_AUTH_FLASH_EMAIL_VERIFIED;

    if (!verificationError && !legacyVerified && !cookieVerified) {
      return;
    }

    notifiedRef.current = true;

    if (verificationError) {
      toast.error(EMAIL_VERIFICATION_FAILED_TOAST.title, {
        description: EMAIL_VERIFICATION_FAILED_TOAST.description,
      });
    } else {
      toast.success(EMAIL_VERIFIED_TOAST.title, { description: EMAIL_VERIFIED_TOAST.description });
      void refetch();
    }

    if (verificationError || legacyVerified) {
      const url = new URL(window.location.href);
      url.searchParams.delete(TOWER_EMAIL_VERIFIED_QUERY);
      url.searchParams.delete("error");
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    }
  }, [flash, refetch, router, searchParams]);

  return null;
}

export function TowerAuthFlashToasts(props: TowerAuthFlashToastsProps) {
  return (
    <Suspense fallback={null}>
      <TowerAuthFlashToastsInner {...props} />
    </Suspense>
  );
}
