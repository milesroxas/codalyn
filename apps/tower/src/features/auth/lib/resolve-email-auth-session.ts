import { authClient } from "@/features/auth/model/auth-client";

type EmailAuthUser = {
  id: string | number;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
};

/** Resolves user + session token after email sign-in/up, using at most one extra `getSession` call. */
export async function resolveUserAndTokenAfterEmailAuth(
  data:
    | {
        user?: EmailAuthUser;
        token?: string | null;
      }
    | null
    | undefined
): Promise<{ user: EmailAuthUser | undefined; token: string | undefined }> {
  const session = await authClient.getSession();
  const u = data?.user ?? session.data?.user;
  const raw = data?.token ?? session.data?.session?.token;
  return { user: u, token: typeof raw === "string" ? raw : undefined };
}
