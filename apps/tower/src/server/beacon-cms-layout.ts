import { getDefaultBeaconAppSettings, parseBeaconAppSettings, webflowDataApiUrl } from "@codalyn/webflow-kit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/shared/lib/db";
import { beaconAppSettings as beaconAppSettingsTable } from "@/shared/lib/db/auth-schema";

const blockSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  props: z.record(z.unknown()).default({}),
});

const compositionSchema = z.object({
  v: z.literal(1),
  blocks: z.array(blockSchema),
});

const loadRequestSchema = z.object({
  collectionId: z.string().min(1),
  itemId: z.string().min(1),
});

const saveRequestSchema = loadRequestSchema.extend({
  composition: compositionSchema,
});

export type CmsLayoutComposition = z.infer<typeof compositionSchema>;
export type CmsLayoutLoadRequest = z.infer<typeof loadRequestSchema>;
export type CmsLayoutSaveRequest = z.infer<typeof saveRequestSchema>;

export function parseCmsLayoutLoadRequest(raw: unknown): CmsLayoutLoadRequest | null {
  const parsed = loadRequestSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseCmsLayoutSaveRequest(raw: unknown): CmsLayoutSaveRequest | null {
  const parsed = saveRequestSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function createEmptyComposition(): CmsLayoutComposition {
  return { v: 1, blocks: [] };
}

export function parseCompositionFromField(
  raw: unknown
): { ok: true; composition: CmsLayoutComposition } | { ok: false; code: string; message: string } {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, composition: createEmptyComposition() };
  }

  if (typeof raw !== "string") {
    return {
      ok: false,
      code: "INVALID_LAYOUT_FIELD_VALUE",
      message: "Layout field value must be a JSON string.",
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      code: "INVALID_LAYOUT_JSON",
      message: "Layout field contains invalid JSON.",
    };
  }

  const parsed = compositionSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_LAYOUT_COMPOSITION",
      message: "Layout JSON does not match the expected composition schema.",
    };
  }
  return { ok: true, composition: parsed.data };
}

export async function resolveUserCmsLayoutFieldSlug(userId: string): Promise<string> {
  const rows = await db
    .select({ payload: beaconAppSettingsTable.payload })
    .from(beaconAppSettingsTable)
    .where(eq(beaconAppSettingsTable.userId, userId))
    .limit(1);
  const settings = rows[0]?.payload ? parseBeaconAppSettings(rows[0].payload) : getDefaultBeaconAppSettings();
  return settings.cmsLayout.fieldSlug.trim();
}

export function webflowCmsItemUrl(collectionId: string, itemId: string): URL {
  return webflowDataApiUrl(["collections", collectionId, "items", itemId]);
}

export function extractItemFieldData(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null;
  }
  if (isRecord(payload.fieldData)) {
    return payload.fieldData;
  }
  if (isRecord(payload.item) && isRecord(payload.item.fieldData)) {
    return payload.item.fieldData;
  }
  return null;
}

export function readUpstreamErrorMessage(raw: unknown, status: number): string {
  if (isRecord(raw)) {
    if (typeof raw.message === "string" && raw.message.trim()) {
      return raw.message;
    }
    if (typeof raw.error === "string" && raw.error.trim()) {
      return raw.error;
    }
  }
  return `Webflow request failed (${status}).`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
