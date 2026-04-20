import {
  getDefaultBeaconAppSettings,
  mergeBeaconAppSettings,
  parseBeaconAppSettings,
  parseBeaconAppSettingsPartial,
  type BeaconAppSettings,
} from "@codalyn/webflow-kit";
import { eq } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { beaconAppSettings as beaconAppSettingsTable } from "@/shared/lib/db/auth-schema";
import { verifyTowerApiRequest } from "@/server/tower-api-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.userId) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(beaconAppSettingsTable)
    .where(eq(beaconAppSettingsTable.userId, auth.userId))
    .limit(1);

  const row = rows[0];
  const settings: BeaconAppSettings = row?.payload
    ? parseBeaconAppSettings(row.payload)
    : getDefaultBeaconAppSettings();

  return Response.json({ settings }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const auth = await verifyTowerApiRequest(req);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.userId) {
    return Response.json({ error: "Session required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = parseBeaconAppSettingsPartial(body);

  const rows = await db
    .select()
    .from(beaconAppSettingsTable)
    .where(eq(beaconAppSettingsTable.userId, auth.userId))
    .limit(1);

  const existingRow = rows[0];
  const base: BeaconAppSettings = existingRow?.payload
    ? parseBeaconAppSettings(existingRow.payload)
    : getDefaultBeaconAppSettings();

  const next = mergeBeaconAppSettings(base, patch);

  await db
    .insert(beaconAppSettingsTable)
    .values({
      userId: auth.userId,
      payload: next,
    })
    .onConflictDoUpdate({
      target: beaconAppSettingsTable.userId,
      set: {
        payload: next,
        updatedAt: new Date(),
      },
    });

  return Response.json({ settings: next }, { headers: { "Cache-Control": "no-store" } });
}
