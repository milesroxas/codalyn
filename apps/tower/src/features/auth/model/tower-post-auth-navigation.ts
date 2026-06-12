"use client";

/** Hard navigation after sign-in so SSR on the app host sees the new session cookie. */
export function completeTowerWebPostAuthNavigation(path: string, origin = window.location.origin): void {
  window.location.assign(new URL(path, origin).href);
}
