import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolvePostAuthRedirectTarget } from "@/features/auth/lib/resolve-post-auth-redirect";
import { auth } from "@/server/auth";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

type AuthContinuePageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function AuthContinuePage({ searchParams }: AuthContinuePageProps) {
  const params = await searchParams;
  const rawCallback = params.callbackUrl;
  const callbackUrl = sanitizeRelativePath(typeof rawCallback === "string" ? rawCallback : "/");
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  redirect(resolvePostAuthRedirectTarget(session.user, callbackUrl));
}
