import { useSyncExternalStore } from "react";
import { towerFetch } from "@/shared/lib/tower-client";

/**
 * First-party Tower session client for the Designer extension.
 *
 * Replaces the `better-auth/react` client (App Review Preflight 2026-09-14): its bundled request
 * layer (`@better-fetch/fetch`) was flagged as third-party data egress and carried the cleartext-
 * scheme and `javascript:` literals the "Insecure Protocols" rule matches. Beacon only ever used
 * three endpoints of it, all on Tower's own origin, so they are three plain `towerFetch` calls
 * here — the extension's only network client, whose destinations the shipped CSP `connect-src`
 * enforces. Tower itself still runs Better Auth; the wire format below is its documented one:
 *
 * - `GET  /api/auth/get-session`  → `{ session, user }` | `null`
 * - `POST /api/auth/sign-in/email` → `{ token?, user }` (bearer also in the `set-auth-token` header)
 *                                    | `{ code?, message? }` with a 4xx status
 * - `POST /api/auth/sign-out`     → `{ success }`
 *
 * Boundary rule (CLAUDE.md): every payload is normalised here before the session hook sees it —
 * an unexpected shape reads as "no session", never as a partially applied one.
 */

/** A signed-in Tower session as Tower reports it (fields the extension reads; others pass through). */
export type TowerSessionPayload = {
  user: Record<string, unknown>;
  session: Record<string, unknown> | null;
};

export type TowerSessionState = {
  data: TowerSessionPayload | null;
  /** True until the first session read settles; a refetch with data already loaded is not pending. */
  isPending: boolean;
  /** HTTP status of the last failed read (0 for a network failure); null after a successful read. */
  errorStatus: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalises a `get-session` body. Better Auth answers `null` for no session and may answer
 * `{ session: null, user: null }`; both read as no session. A body without a `user` object is
 * not a session either (nothing downstream can identify the account).
 */
export function normalizeTowerSessionPayload(raw: unknown): TowerSessionPayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  const user = raw.user;
  if (!isRecord(user)) {
    return null;
  }
  const session = raw.session;
  return { user, session: isRecord(session) ? session : null };
}

const JSON_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };

async function readJsonBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Session store (one per extension document; `useTowerSession` subscribes React to it)
// ---------------------------------------------------------------------------------------------

let state: TowerSessionState = { data: null, isPending: true, errorStatus: null };
const listeners = new Set<() => void>();
let initialReadStarted = false;
/** Monotonic read id; a read that is no longer the latest must not write its result. */
let latestRead = 0;

function setState(next: TowerSessionState): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

/** Test seam: forget everything, as a fresh document would. */
export function resetTowerSessionStoreForTests(): void {
  state = { data: null, isPending: true, errorStatus: null };
  listeners.clear();
  initialReadStarted = false;
  latestRead = 0;
}

/**
 * Reads the current session from Tower and publishes it. Resolves once *this* read has settled
 * (or was superseded by a newer one), so `await refetchTowerSession()` after writing a bearer
 * token observes the session that token grants. Never rejects.
 */
export async function refetchTowerSession(): Promise<void> {
  initialReadStarted = true;
  const readId = ++latestRead;
  setState({ ...state, isPending: state.data === null });
  let next: TowerSessionState;
  try {
    const res = await towerFetch("/api/auth/get-session", { method: "GET", headers: { Accept: "application/json" } });
    if (res.ok) {
      next = { data: normalizeTowerSessionPayload(await readJsonBody(res)), isPending: false, errorStatus: null };
    } else {
      // 401 means the bearer no longer grants a session; other failures keep what was known.
      next = { data: res.status === 401 ? null : state.data, isPending: false, errorStatus: res.status };
    }
  } catch {
    next = { data: state.data, isPending: false, errorStatus: 0 };
  }
  if (readId === latestRead) {
    setState(next);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!initialReadStarted) {
    void refetchTowerSession();
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): TowerSessionState {
  return state;
}

/**
 * The Tower session for React consumers. The first subscriber starts the initial read; every
 * consumer shares the same store, so mounting several does not fan out requests.
 */
export function useTowerSession(): TowerSessionState & { refetch: () => Promise<void> } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...snapshot, refetch: refetchTowerSession };
}

// ---------------------------------------------------------------------------------------------
// Sign-in / sign-out
// ---------------------------------------------------------------------------------------------

export type TowerEmailSignInError = { code?: string; message?: string; status: number };

export type TowerEmailSignInResponse = { ok: true; token: string | null } | { ok: false; error: TowerEmailSignInError };

/**
 * `POST /api/auth/sign-in/email`. On success the bearer is taken from the JSON body's `token`,
 * falling back to the `set-auth-token` response header (Tower exposes it via CORS); `null` when
 * neither carried one. Error bodies are reduced to `{ code, message, status }` for the UI mapper.
 * A network failure reads as status 0 with no code.
 */
export async function requestTowerEmailSignIn(email: string, password: string): Promise<TowerEmailSignInResponse> {
  let res: Response;
  try {
    res = await towerFetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, error: { status: 0 } };
  }
  const body = await readJsonBody(res);
  if (!res.ok) {
    const record = isRecord(body) ? body : {};
    return {
      ok: false,
      error: {
        ...(typeof record.code === "string" ? { code: record.code } : {}),
        ...(typeof record.message === "string" ? { message: record.message } : {}),
        status: res.status,
      },
    };
  }
  const bodyToken = isRecord(body) && typeof body.token === "string" ? body.token.trim() : "";
  const headerToken = res.headers.get("set-auth-token")?.trim() ?? "";
  const token = bodyToken || headerToken;
  return { ok: true, token: token || null };
}

/**
 * `POST /api/auth/sign-out` for the current bearer. Resolves whether or not Tower could be reached
 * — the caller clears the local token either way — reporting only whether Tower acknowledged.
 */
export async function requestTowerSignOut(): Promise<{ ok: boolean }> {
  try {
    const res = await towerFetch("/api/auth/sign-out", { method: "POST", headers: { Accept: "application/json" } });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
