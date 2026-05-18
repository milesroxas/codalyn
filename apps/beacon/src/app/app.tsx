import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { BeaconAppShell } from "@/app/beacon-app-shell";
import { BeaconHomeScreen } from "@/app/ui/beacon-home-screen";
import { CmsSlotsAccessGate, CmsSlotsScreen } from "@/features/cms-slots";
import { ImageEditor } from "@/features/image-editor";
import { BeaconAppSettingsProvider, BeaconSettingsScreen } from "@/features/settings";
import { applyBeaconExtensionSize } from "@/shared/lib/beacon-extension-size";
import { isCmsSlotsSurfaceEnabled } from "@/shared/lib/cms-slots-surface-enabled";
import { TooltipProvider } from "@/shared/ui/tooltip";

function BeaconSettingsPage() {
  const navigate = useNavigate();
  return <BeaconSettingsScreen onBack={() => navigate(-1)} />;
}

function BeaconImagesPage() {
  return <ImageEditor />;
}

function LegacyBeaconsSegmentRedirect() {
  const { segment } = useParams();
  const next = segment === "engine" || segment === "composer" ? segment : "engine";
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
    <BeaconAppSettingsProvider>
      <HashRouter>
        <TooltipProvider delayDuration={200}>
          <Routes>
            <Route path="/settings" element={<BeaconSettingsPage />} />
            <Route element={<BeaconAppShell />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<BeaconHomeScreen />} />
              <Route path="images" element={<BeaconImagesPage />} />
              <Route path="cms-slots/:segment" element={<CmsSlotsRoutePage />} />
              <Route path="cms-slots" element={<Navigate to="/cms-slots/engine" replace />} />
              <Route path="beacons/:segment" element={<LegacyBeaconsSegmentRedirect />} />
              <Route path="beacons" element={<Navigate to="/cms-slots/engine" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Routes>
        </TooltipProvider>
      </HashRouter>
    </BeaconAppSettingsProvider>
  );
}
