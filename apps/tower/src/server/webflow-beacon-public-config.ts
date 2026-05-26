import { normalizeWebflowAppClientId } from "@codalyn/webflow-kit";

export type WebflowBeaconPublicConfig = {
  webflowAppClientId: string | null;
};

export function resolveWebflowBeaconPublicConfig(): WebflowBeaconPublicConfig {
  return {
    webflowAppClientId: normalizeWebflowAppClientId(process.env.WEBFLOW_CLIENT_ID),
  };
}
