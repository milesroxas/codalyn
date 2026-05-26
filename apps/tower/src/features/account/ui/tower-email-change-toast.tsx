"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { toast } from "sonner";
import { CHANGE_EMAIL_ACCOUNT_COPY, readEmailChangeSuccess } from "@/features/auth/lib/change-email";
import { authClient } from "@/features/auth/model/auth-client";
import { TOWER_EMAIL_CHANGED_QUERY } from "@/shared/lib/auth/change-email-query";

function TowerEmailChangeToastInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notifiedRef = useRef(false);
  const { refetch } = authClient.useSession();

  useEffect(() => {
    if (notifiedRef.current || !readEmailChangeSuccess(searchParams)) {
      return;
    }
    notifiedRef.current = true;
    toast.success(CHANGE_EMAIL_ACCOUNT_COPY.changedToast.title, {
      description: CHANGE_EMAIL_ACCOUNT_COPY.changedToast.description,
    });
    void refetch();
    const url = new URL(window.location.href);
    url.searchParams.delete(TOWER_EMAIL_CHANGED_QUERY);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [refetch, router, searchParams]);

  return null;
}

export function TowerEmailChangeToast() {
  return (
    <Suspense fallback={null}>
      <TowerEmailChangeToastInner />
    </Suspense>
  );
}
