import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { isTowerProductAdmin } from "@/server/membership/product-admin";

export type OperatorSessionUser = {
  id: string;
  email: string;
  name: string;
  role: string | null;
};

export type OperatorAuthResult =
  | { ok: true; user: OperatorSessionUser }
  | { ok: false; response: NextResponse<{ error: string }> };

/**
 * Gate operator APIs on the Better Auth `product_admin` role.
 * Returns a `NextResponse` to forward when unauthorized so callers can early-return without
 * assembling error bodies themselves.
 */
export async function requireProductAdmin(): Promise<OperatorAuthResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user?.id) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!isTowerProductAdmin(user)) {
    return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user as { role?: string | null }).role ?? null,
    },
  };
}
