import { NextResponse } from "next/server";
import { syncProductAdminRolesFromEnv } from "@/server/membership/sync-product-admin-emails";

let productAdminSyncStarted = false;

export async function GET() {
  if (!productAdminSyncStarted) {
    productAdminSyncStarted = true;
    try {
      await syncProductAdminRolesFromEnv();
    } catch (e) {
      console.error("[tower] syncProductAdminRolesFromEnv failed", e);
    }
  }
  return NextResponse.json({ ok: true, service: "tower" });
}
