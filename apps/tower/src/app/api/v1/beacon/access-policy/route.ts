/**
 * Beacon-facing mirror of `GET /api/account/access-policy` so the Designer extension can read the
 * early-access gate state. `/api/v1` responses get CORS headers from the middleware for Webflow
 * extension origins; `/api/account/*` responses are not readable cross-origin.
 */
export { GET } from "@/app/api/account/access-policy/route";
