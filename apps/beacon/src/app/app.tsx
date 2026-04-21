import { useState } from "react";
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import Header from "@/app/ui/Header";
import { CmsEditorScreen } from "@/features/cms-editor";
import { ImageEditor } from "@/features/image-editor";
import { BeaconAppSettingsProvider, BeaconSettingsScreen } from "@/features/settings";
import { isBeaconExtendedFeaturesEnabled } from "@/shared/config/beacon-feature-flags";
import { buildInfo } from "@/shared/lib/build-info";
import { TooltipProvider } from "@/shared/ui/tooltip";

type BeaconShellOutletContext = {
  setOnboardingVisible: (visible: boolean) => void;
};

function BeaconSettingsPage() {
  const navigate = useNavigate();
  return <BeaconSettingsScreen onBack={() => navigate(-1)} />;
}

function BeaconImagesPage() {
  const { setOnboardingVisible } = useOutletContext<BeaconShellOutletContext>();
  return <ImageEditor onOnboardingVisibilityChange={setOnboardingVisible} />;
}

function BeaconEditorPage() {
  if (!isBeaconExtendedFeaturesEnabled()) {
    return <Navigate to="/images" replace />;
  }
  return <CmsEditorScreen />;
}

function BeaconShell() {
  const extended = isBeaconExtendedFeaturesEnabled();
  const [onboardingVisible, setOnboardingVisible] = useState(true);
  const location = useLocation();

  const showHeader = !onboardingVisible || (extended && location.pathname === "/editor");

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-version={buildInfo.version}>
      {showHeader ? <Header beaconExtendedFeatures={extended} /> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-4">
        <Outlet context={{ setOnboardingVisible }} />
      </div>
    </main>
  );
}

export function App() {
  return (
    <BeaconAppSettingsProvider>
      <HashRouter>
        <TooltipProvider delayDuration={200}>
          <Routes>
            <Route path="/settings" element={<BeaconSettingsPage />} />
            <Route element={<BeaconShell />}>
              <Route index element={<Navigate to="/images" replace />} />
              <Route path="images" element={<BeaconImagesPage />} />
              <Route path="editor" element={<BeaconEditorPage />} />
              <Route path="*" element={<Navigate to="/images" replace />} />
            </Route>
          </Routes>
        </TooltipProvider>
      </HashRouter>
    </BeaconAppSettingsProvider>
  );
}
