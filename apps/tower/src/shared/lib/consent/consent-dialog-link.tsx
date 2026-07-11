"use client";

// Client-boundary re-export: the package's own `@c15t/nextjs/components/consent-dialog-link`
// entry uses `export *`, which Next.js webpack builds reject in client boundaries.
export { ConsentDialogLink } from "@c15t/nextjs";
