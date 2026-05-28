import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { BeaconAppShell } from "@/app/beacon-app-shell";
import { BeaconHomeScreen } from "@/app/ui/beacon-home-screen";
import { CmsSlotsAccessGate, CmsSlotsScreen } from "@/features/cms-slots";
import { type CmsSlotsRouteSegment, resolveAllowedCmsSlotsSegment } from "@/features/cms-slots/model/cms-slots-access";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { ImageEditor } from "@/features/image-editor";
import { BeaconAppSettingsProvider, BeaconSettingsScreen } from "@/features/settings";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { applyBeaconExtensionSize } from "@/shared/lib/beacon-extension-size";
import { isCmsSlotsSurfaceEnabled } from "@/shared/lib/cms-slots-surface-enabled";
import { CmsCollectionTemplatePageProvider } from "@/shared/lib/use-cms-collection-template-page";
import { TooltipProvider } from "@/shared/ui/tooltip";

function BeaconSettingsPage() {
  const navigate = useNavigate();
  return <BeaconSettingsScreen onBack={() => navigate(-1)} />;
}

function BeaconImagesPage() {
  return <ImageEditor />;
}

function CmsSlotsIndexRedirect() {
  const { defaultSegment } = useCmsSlotsAccess();
  return <Navigate to={`/cms-slots/${defaultSegment}`} replace />;
}

function LegacyBeaconsSegmentRedirect() {
  const { segment } = useParams();
  const { defaultSegment, editorExperience } = useCmsSlotsAccess();
  const raw: CmsSlotsRouteSegment | undefined = segment === "engine" || segment === "composer" ? segment : undefined;
  const next = raw != null ? resolveAllowedCmsSlotsSegment(raw, editorExperience) : defaultSegment;
  return <Navigate to={`/cms-slots/${next}`} replace />;
}

function CmsSlotsRoutePage() {
  if (!isCmsSlotsSurfaceEnabled()) {
    return <Navigate to="/home" replace />;
  }
  return (
    <CmsSlotsAccessGate>
      <CmsSlotsScreen />
    </CmsSlotsAccessGate>
  );
}

export function App() {
  useEffect(() => {
    applyBeaconExtensionSize();
  }, []);

  return (
    <ErrorBoundary>
      <BeaconAppSettingsProvider>
        <CmsCollectionTemplatePageProvider>
          <HashRouter>
            <TooltipProvider delayDuration={200}>
              <Routes>
                <Route element={<BeaconAppShell />}>
                  <Route index element={<Navigate to="/home" replace />} />
                  <Route path="home" element={<BeaconHomeScreen />} />
                  <Route path="images" element={<BeaconImagesPage />} />
                  <Route path="settings" element={<BeaconSettingsPage />} />
                  <Route path="cms-slots/:segment" element={<CmsSlotsRoutePage />} />
                  <Route path="cms-slots" element={<CmsSlotsIndexRedirect />} />
                  <Route path="beacons/:segment" element={<LegacyBeaconsSegmentRedirect />} />
                  <Route path="beacons" element={<CmsSlotsIndexRedirect />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Route>
              </Routes>
            </TooltipProvider>
          </HashRouter>
        </CmsCollectionTemplatePageProvider>
      </BeaconAppSettingsProvider>
    </ErrorBoundary>
  );
}
