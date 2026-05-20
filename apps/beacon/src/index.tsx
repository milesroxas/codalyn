import "./styles/globals.css";
import { createRoot } from "react-dom/client";
import { App } from "@/app/app";
import { injectBeaconAppBackgroundCssVars } from "@/shared/lib/beacon-app-backgrounds";
import { initObservability } from "@/shared/lib/init-observability";

injectBeaconAppBackgroundCssVars();
initObservability();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
