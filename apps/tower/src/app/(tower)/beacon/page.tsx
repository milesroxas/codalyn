import { TowerBeaconScreen } from "@/features/beacon/ui/tower-beacon-screen";
import { hasWebflowOAuthCredentials } from "@/server/webflow-proxy-token";

export const dynamic = "force-dynamic";

export default function BeaconPage() {
  return <TowerBeaconScreen oauthConfigured={hasWebflowOAuthCredentials()} />;
}
