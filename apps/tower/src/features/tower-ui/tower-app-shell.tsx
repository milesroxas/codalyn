"use client";

import { usePathname } from "next/navigation";
import type * as React from "react";
import { useTowerSignOutTransition } from "@/features/auth/model/tower-sign-out-transition";
import { TowerAppSidebar } from "@/features/tower-ui/tower-app-sidebar";
import type { TowerLandingAppLinks } from "@/features/tower-ui/tower-landing";
import { TowerLoggedOutHeader } from "@/features/tower-ui/tower-logged-out-header";
import { TowerSiteHeader } from "@/features/tower-ui/tower-site-header";
import { isTowerAuthSurfacePath } from "@/shared/lib/navigation/tower-auth-surfaces";
import {
  isTowerCmsRootPagePath,
  isTowerMarketingInnerPagePath,
  isTowerMarketingSelfContainedPath,
  TOWER_SUPPORT_PATH,
} from "@/shared/lib/navigation/tower-marketing-paths";
import { cn } from "@/shared/lib/utils";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/shared/ui/sidebar";
import { TowerPublicPageScroll } from "@/shared/ui/tower-public-page-scroll";

const shellStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties;

type TowerAppShellProps = {
  billingEnabled: boolean;
  /**
   * Server-rendered session state. Chrome follows this exclusively so it always matches the
   * server-rendered `children`; client-session divergence (for example sign-out in another
   * tab) is reconciled by `TowerSessionSync` via a server round-trip, never a chrome swap.
   */
  signedIn: boolean;
  canCreateWorkspace?: boolean;
  usageBanner?: React.ReactNode;
  emailVerificationBanner?: React.ReactNode;
  workspaceOnboarding?: React.ReactNode;
  publicHeaderLinks?: Pick<TowerLandingAppLinks, "beacon" | "flint" | "home" | "signIn" | "tower">;
  children: React.ReactNode;
};

function TowerAuthenticatedShell({
  billingEnabled,
  canCreateWorkspace,
  usageBanner,
  emailVerificationBanner,
  workspaceOnboarding,
  signingOut,
  children,
}: {
  billingEnabled: boolean;
  canCreateWorkspace: boolean;
  usageBanner?: React.ReactNode;
  emailVerificationBanner?: React.ReactNode;
  workspaceOnboarding?: React.ReactNode;
  signingOut: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("h-dvh", signingOut && "pointer-events-none tl-marketing-page-transition--exit")}
      aria-busy={signingOut || undefined}
    >
      <SidebarProvider className="h-dvh overflow-hidden" style={shellStyle}>
        <TowerAppSidebar billingEnabled={billingEnabled} canCreateWorkspace={canCreateWorkspace} variant="inset" />
        <SidebarInset>
          <TowerSiteHeader />
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-4 pt-2 pb-8 md:gap-6 md:pt-3 md:pb-10">
                  {usageBanner || emailVerificationBanner || workspaceOnboarding ? (
                    <div className="flex flex-col gap-3 px-4 lg:px-6">
                      {usageBanner}
                      {emailVerificationBanner}
                      {workspaceOnboarding}
                    </div>
                  ) : null}
                  <div className="flex w-full flex-col px-4 lg:px-6">{children}</div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export function TowerAppShell({
  billingEnabled,
  signedIn,
  canCreateWorkspace = false,
  usageBanner,
  emailVerificationBanner,
  workspaceOnboarding,
  publicHeaderLinks,
  children,
}: TowerAppShellProps) {
  const pathname = usePathname();
  const signingOut = useTowerSignOutTransition();

  const showAuthenticatedChrome = signedIn || signingOut;
  // Full-bleed surfaces that render their own layout (AuthShell) in both auth states.
  const isBareSurface = isTowerAuthSurfacePath(pathname) || pathname === TOWER_SUPPORT_PATH;

  // CMS root pages (e.g. /pricing) render their own marketing chrome via
  // CmsMarketingScreen, same as the self-contained product pages.
  if ((isTowerMarketingSelfContainedPath(pathname) || isTowerCmsRootPagePath(pathname)) && !showAuthenticatedChrome) {
    return children;
  }

  if (!showAuthenticatedChrome) {
    if (isBareSurface) {
      return children;
    }

    return (
      <div
        className={cn(
          "relative flex min-h-dvh flex-col",
          isTowerMarketingInnerPagePath(pathname) ? "bg-black text-foreground antialiased" : "bg-background"
        )}
      >
        <TowerLoggedOutHeader publicHeaderLinks={publicHeaderLinks} />
        <div className="flex min-h-0 flex-1 flex-col">
          {isTowerMarketingInnerPagePath(pathname) ? (
            <TowerPublicPageScroll>{children}</TowerPublicPageScroll>
          ) : (
            children
          )}
        </div>
      </div>
    );
  }

  if (isBareSurface && !signingOut) {
    return children;
  }

  return (
    <TowerAuthenticatedShell
      billingEnabled={billingEnabled}
      canCreateWorkspace={canCreateWorkspace}
      usageBanner={usageBanner}
      emailVerificationBanner={emailVerificationBanner}
      workspaceOnboarding={workspaceOnboarding}
      signingOut={signingOut}
    >
      {children}
    </TowerAuthenticatedShell>
  );
}
