import "./styles/globals.css";
import { createRoot } from "react-dom/client";
import { initObservability } from "@/shared/lib/init-observability";

initObservability();

import Header from "@/app/ui/Header";
import { FlintTowerProvider } from "@/features/auth/model/flint-tower-provider";
import { AccountSyncView } from "@/features/auth/ui/AccountSyncView";
import { useExpandedView } from "@/features/linter/store/expandedView.store";
import { ExpandedContent } from "@/features/linter/ui/expanded/ExpandedContent";
import { IgnoredClassesListsView } from "@/features/linter/ui/expanded/IgnoredClassesListsView";
import { RecognizedElementsView } from "@/features/linter/ui/expanded/RecognizedElementsView";
import { ThirdPartyLibrariesView } from "@/features/linter/ui/expanded/ThirdPartyLibrariesView";
import { LinterPanel } from "@/features/linter/view/LinterPanel";
import { SettingsPanel } from "@/features/settings/ui/SettingsPanel";
import ExtensionWrapper from "@/features/window/components/ExtensionWrapper";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { cn } from "@/shared/utils";

const Root = () => {
  const { isActive, content, closeExpandedView, openExpandedView } = useExpandedView();

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="flowlint-ui-theme">
        <FlintTowerProvider>
          <ExtensionWrapper>
            <div className="flex h-full flex-col relative overflow-hidden">
              {/* Main App Content */}
              <div
                className={cn(
                  "flex h-full flex-col transition-all duration-300 ease-in-out",
                  isActive ? "translate-x-[-100%] opacity-0" : "translate-x-0 opacity-100"
                )}
              >
                <Header />
                <div className="flex-1 min-h-0">
                  <LinterPanel />
                </div>
              </div>

              {/* Expanded View Content */}
              <div
                className={cn(
                  "absolute inset-0 flex flex-col transition-all duration-300 ease-in-out",
                  isActive ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                )}
              >
                {isActive && content && content.type === "recognized-elements" && (
                  <ExpandedContent
                    title={content.title}
                    onBack={() => (content.backTo ? openExpandedView(content.backTo) : closeExpandedView())}
                  >
                    <RecognizedElementsView
                      presetId={(content.data as any)?.presetId || ""}
                      projectElements={(content.data as any)?.projectElements || []}
                    />
                  </ExpandedContent>
                )}
                {isActive && content && content.type === "settings" && (
                  <ExpandedContent title={content.title} onBack={closeExpandedView}>
                    <SettingsPanel />
                  </ExpandedContent>
                )}
                {isActive && content && content.type === "account-sync" && (
                  <ExpandedContent
                    title={content.title}
                    onBack={() => (content.backTo ? openExpandedView(content.backTo) : closeExpandedView())}
                  >
                    <AccountSyncView />
                  </ExpandedContent>
                )}
                {isActive && content && content.type === "third-party-libraries" && (
                  <ExpandedContent title={content.title} onBack={closeExpandedView}>
                    <ThirdPartyLibrariesView />
                  </ExpandedContent>
                )}
                {isActive && content && content.type === "ignored-classes-lists" && (
                  <ExpandedContent
                    title={content.title}
                    onBack={() => (content.backTo ? openExpandedView(content.backTo) : closeExpandedView())}
                  >
                    <IgnoredClassesListsView />
                  </ExpandedContent>
                )}
              </div>
            </div>
          </ExtensionWrapper>
        </FlintTowerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

// Render the extension UI
root.render(<Root />);
