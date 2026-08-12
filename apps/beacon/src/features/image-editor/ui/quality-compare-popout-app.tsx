import { useQualityPopoutBridge } from "@/features/image-editor/lib/use-quality-popout-bridge";
import { QualityComparePopoutPage } from "@/features/image-editor/ui/quality-compare-popout-page";

/** Container for the popout window: opener postMessage bridge + presentational page. */
export function QualityComparePopoutApp() {
  const bridge = useQualityPopoutBridge();
  return <QualityComparePopoutPage {...bridge} />;
}
