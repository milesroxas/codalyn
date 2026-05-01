import { useEffect } from "react";
import { HashRouter, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { BeaconHomeScreen } from "@/app/ui/beacon-home-screen";
import Header from "@/app/ui/Header";
import { BeaconsScreen } from "@/features/beacons";
import { ImageEditor } from "@/features/image-editor";
import { BeaconAppSettingsProvider, BeaconSettingsScreen } from "@/features/settings";
import { applyBeaconExtensionSize } from "@/shared/lib/beacon-extension-size";
import { isBeaconsSurfaceEnabled } from "@/shared/lib/beacons-surface-enabled";
import { buildInfo } from "@/shared/lib/build-info";
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

function BeaconShell() {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-version={buildInfo.version}>
      <Header />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-4">
        <Outlet />
      </div>
    </main>
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
            <Route element={<BeaconShell />}>
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
