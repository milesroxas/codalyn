import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

import { isValidTowerCmsPageSlug, towerCmsPagePath } from "@/shared/lib/navigation/tower-marketing-paths";

export async function GET(request: Request): Promise<Response> {
  (await draftMode()).disable();

  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  redirect(isValidTowerCmsPageSlug(slug) ? towerCmsPagePath(slug) : "/");
}
