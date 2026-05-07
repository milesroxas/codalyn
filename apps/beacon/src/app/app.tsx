import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { BeaconAppShell } from "@/app/beacon-app-shell";
import { BeaconHomeScreen } from "@/app/ui/beacon-home-screen";
import { BeaconsScreen } from "@/features/beacons";
import { ImageEditor } from "@/features/image-editor";
import { BeaconAppSettingsProvider, BeaconSettingsScreen } from "@/features/settings";
import { applyBeaconExtensionSize } from "@/shared/lib/beacon-extension-size";
import { isBeaconsSurfaceEnabled } from "@/shared/lib/beacons-surface-enabled";
import { TooltipProvider } from "@/shared/ui/tooltip";

function BeaconSettingsPage() {
  const navigate = useNavigate();
  return <BeaconSettingsScreen onBack={() => navigate(-1)} />;
}

function BeaconImagesPage() {
  return <ImageEditor />;
}

function BeaconBeaconsPage() {
  if (!isBeaconsSurfaceEnabled()) {
    return <Navigate to="/home" replace />;
  }
  return <BeaconsScreen />;
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
              <Route path="beacons/:segment" element={<BeaconBeaconsPage />} />
              <Route path="beacons" element={<Navigate to="/beacons/engine" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>
          </Routes>
        </TooltipProvider>
      </HashRouter>
    </BeaconAppSettingsProvider>
  );
}
