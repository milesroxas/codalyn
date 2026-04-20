import { useState } from "react";
import Header from "@/app/ui/Header";
import { ImageEditor } from "@/features/image-editor";
import { buildInfo } from "@/shared/lib/build-info";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { TooltipProvider } from "@/shared/ui/tooltip";

export function App() {
  const [onboardingVisible, setOnboardingVisible] = useState(true);

  return (
    <ThemeProvider defaultTheme="light" storageKey="beacon-ui-theme">
      <TooltipProvider delayDuration={200}>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden" data-version={buildInfo.version}>
          {onboardingVisible ? null : <Header />}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
            <ImageEditor onOnboardingVisibilityChange={setOnboardingVisible} />
          </div>
        </main>
      </TooltipProvider>
    </ThemeProvider>
  );
}
