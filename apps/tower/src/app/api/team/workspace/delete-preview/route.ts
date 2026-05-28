import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { loadWorkspaceDeletionPreview } from "@/server/membership/workspace-deletion-preview";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const organizationId = url.searchParams.get("organizationId")?.trim() ?? "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  try {
    const preview = await loadWorkspaceDeletionPreview(organizationId, userId);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "workspace_not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}
