import "./styles/globals.css";
import { createRoot } from "react-dom/client";
import { App } from "@/app/app";
import { initObservability } from "@/shared/lib/init-observability";

initObservability();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
