import { permanentRedirect } from "next/navigation";

import { towerCmsPagePath } from "@/shared/lib/navigation/tower-marketing-paths";

export const dynamic = "force-dynamic";

type Args = {
  params: Promise<{ slug: string }>;
};

/** Legacy CMS namespace — pages now live at the root slug (`/p/pricing` → `/pricing`). */
export default async function LegacyCmsPage({ params }: Args) {
  const { slug } = await params;
  permanentRedirect(towerCmsPagePath(slug));
}
