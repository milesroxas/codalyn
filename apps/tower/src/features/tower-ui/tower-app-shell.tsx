"use client";

import { usePathname } from "next/navigation";
import type * as React from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { TOWER_PUBLIC_LOGGED_OUT_SURFACES } from "@/features/tower-ui/lib/tower-app-nav";
import { TowerAppSidebar } from "@/features/tower-ui/tower-app-sidebar";
import { TowerLoggedOutHeader } from "@/features/tower-ui/tower-logged-out-header";
import { TowerSiteHeader } from "@/features/tower-ui/tower-site-header";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/shared/ui/sidebar";

const shellStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties;

type TowerAppShellProps = {
  billingEnabled: boolean;
  /** Server session hint — keeps authenticated chrome stable while client session hydrates. */
  signedIn: boolean;
  canCreateWorkspace?: boolean;
  usageBanner?: React.ReactNode;
  emailVerificationBanner?: React.ReactNode;
  workspaceOnboarding?: React.ReactNode;
  children: React.ReactNode;
};

function TowerAuthenticatedShell({
  billingEnabled,
  canCreateWorkspace,
  usageBanner,
  emailVerificationBanner,
  workspaceOnboarding,
  children,
}: {
  billingEnabled: boolean;
  canCreateWorkspace: boolean;
  usageBanner?: React.ReactNode;
  emailVerificationBanner?: React.ReactNode;
  workspaceOnboarding?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
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
  );
}

export function TowerAppShell({
  billingEnabled,
  signedIn,
  canCreateWorkspace = false,
  usageBanner,
  emailVerificationBanner,
  workspaceOnboarding,
  children,
}: TowerAppShellProps) {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  const authenticated = isPending ? signedIn : Boolean(session?.user);

  if (!authenticated && TOWER_PUBLIC_LOGGED_OUT_SURFACES.has(pathname)) {
    return children;
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-dvh flex-col">
        <TowerLoggedOutHeader />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <TowerAuthenticatedShell
      billingEnabled={billingEnabled}
      canCreateWorkspace={canCreateWorkspace}
      usageBanner={usageBanner}
      emailVerificationBanner={emailVerificationBanner}
      workspaceOnboarding={workspaceOnboarding}
    >
      {children}
    </TowerAuthenticatedShell>
  );
}
