"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { tryFinishBeaconTowerAuthPopup } from "@/features/auth/lib/beacon-opener-auth";
import { resolveUserAndTokenAfterEmailAuth, userToBeaconPayload } from "@/features/auth/lib/resolve-email-auth-session";
import { authClient } from "@/features/auth/model/auth-client";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const beaconOrigin = searchParams.get("beaconOrigin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { data, error: err } = await authClient.signIn.email({
      email,
      password,
      ...(beaconOrigin ? {} : { callbackURL: callbackUrl }),
    });
    setPending(false);
    if (err) {
      setError(err.message ?? "Sign in failed");
      return;
    }
    const { user: u, token } = await resolveUserAndTokenAfterEmailAuth(data);
    if (tryFinishBeaconTowerAuthPopup(beaconOrigin, u ? userToBeaconPayload(u) : undefined, token)) {
      return;
    }
    if (data?.user) {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-neutral-600">
        No account?{" "}
        <Link
          href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}${beaconOrigin ? `&beaconOrigin=${encodeURIComponent(beaconOrigin)}` : ""}`}
          className="underline"
        >
          Sign up
        </Link>
      </p>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
