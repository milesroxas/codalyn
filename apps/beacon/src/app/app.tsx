import { useState } from "react";
import Header from "@/app/ui/Header";
import { ImageEditor } from "@/features/image-editor";
import { BeaconAppSettingsProvider, BeaconSettingsScreen } from "@/features/settings";
import { buildInfo } from "@/shared/lib/build-info";
import { TooltipProvider } from "@/shared/ui/tooltip";

export function App() {
  const [onboardingVisible, setOnboardingVisible] = useState(true);
  const [surface, setSurface] = useState<"main" | "settings">("main");

  return (
    <BeaconAppSettingsProvider>
      <TooltipProvider delayDuration={200}>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden" data-version={buildInfo.version}>
          {surface === "settings" ? (
            <BeaconSettingsScreen onBack={() => setSurface("main")} />
          ) : (
            <>
              {onboardingVisible ? null : <Header onOpenSettings={() => setSurface("settings")} />}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
                <ImageEditor onOnboardingVisibilityChange={setOnboardingVisible} />
              </div>
            </>
          )}
        </main>
      </TooltipProvider>
    </BeaconAppSettingsProvider>
  );
}
