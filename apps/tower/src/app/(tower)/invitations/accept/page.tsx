"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId");
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const attempted = useRef(false);

  const callbackUrl = invitationId ? `/invitations/accept?invitationId=${encodeURIComponent(invitationId)}` : "/";

  useEffect(() => {
    if (!invitationId || sessionPending || attempted.current) {
      return;
    }
    if (!session?.user) {
      return;
    }
    attempted.current = true;
    setWorking(true);
    setError(null);
    void authClient.organization
      .acceptInvitation({ invitationId })
      .then((result) => {
        setWorking(false);
        if (result.error) {
          setError(result.error.message ?? "Could not accept invitation");
          attempted.current = false;
          return;
        }
        router.push("/");
        router.refresh();
      })
      .catch((e: unknown) => {
        setWorking(false);
        attempted.current = false;
        setError(e instanceof Error ? e.message : "Could not accept invitation");
      });
  }, [invitationId, session?.user, sessionPending, router]);

  if (!invitationId) {
    return (
      <main className="mx-auto max-w-sm px-6 py-8">
        <p className="text-sm text-neutral-600">Missing invitation. Check the link in your email.</p>
      </main>
    );
  }

  if (sessionPending) {
    return (
      <main className="mx-auto max-w-sm px-6 py-8">
        <p className="text-sm text-neutral-600">Loading…</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-8">
        <h1 className="text-xl font-semibold">Accept invitation</h1>
        <p className="text-sm text-neutral-600">
          Sign in or create an account with the email address that received the invite, then you’ll join the team.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="rounded bg-neutral-900 px-3 py-2 text-center text-sm text-white"
          >
            Sign in
          </Link>
          <Link
            href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="rounded border border-neutral-300 px-3 py-2 text-center text-sm"
          >
            Create account
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-sm px-6 py-8">
        <p className="text-sm text-red-600">{error}</p>
        <p className="mt-4 text-sm text-neutral-600">
          <Link href="/" className="underline">
            Back to home
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-8">
      <p className="text-sm text-neutral-600">{working ? "Joining team…" : "Finishing…"}</p>
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-neutral-600">Loading…</p>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
