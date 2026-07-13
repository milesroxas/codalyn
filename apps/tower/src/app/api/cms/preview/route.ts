import config from "@payload-config";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { isValidTowerCmsPageSlug, TOWER_CMS_PAGE_PATH_PREFIX } from "@/shared/lib/navigation/tower-marketing-paths";

/**
 * Enables Next.js draft mode for CMS editors, then redirects to the page.
 * Auth is Payload's own (`payload-token` cookie) — only signed-in CMS users may preview drafts.
 */
export async function GET(request: Request): Promise<Response> {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!isValidTowerCmsPageSlug(slug)) {
    return new Response("Invalid slug", { status: 400 });
  }

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  (await draftMode()).enable();
  redirect(`${TOWER_CMS_PAGE_PATH_PREFIX}/${slug}`);
}
