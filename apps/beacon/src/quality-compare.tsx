import { createRoot } from "react-dom/client";
import { QualityComparePopoutApp } from "@/features/image-editor/ui/quality-compare-popout-app";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<QualityComparePopoutApp />);
}
