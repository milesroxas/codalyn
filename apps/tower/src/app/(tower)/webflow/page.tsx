import { redirect } from "next/navigation";
import { TOWER_CONNECTION_PATH, TOWER_CONNECTION_STATUS_QUERY } from "@/shared/lib/navigation/tower-app-paths";

type WebflowRouteRedirectProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy `/webflow` URL — forwards to `/connection` and maps the old status query param. */
export default async function WebflowRouteRedirect({ searchParams }: WebflowRouteRedirectProps) {
  const params = await searchParams;
  const legacyStatus = params.webflow;
  const status =
    typeof legacyStatus === "string" ? legacyStatus : Array.isArray(legacyStatus) ? legacyStatus[0] : undefined;

  if (status) {
    const next = new URLSearchParams({ [TOWER_CONNECTION_STATUS_QUERY]: status });
    redirect(`${TOWER_CONNECTION_PATH}?${next.toString()}`);
  }

  redirect(TOWER_CONNECTION_PATH);
}
