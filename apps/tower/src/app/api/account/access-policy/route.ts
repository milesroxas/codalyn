import { NextResponse } from "next/server";
import { isTowerEarlyAccessGateEnabled } from "@/server/access/early-access-feature";

/** Public policy for Tower and Beacon auth UI (no session required). */
export async function GET() {
  return NextResponse.json({
    earlyAccessRequired: isTowerEarlyAccessGateEnabled(),
  });
}
