import { IconPlug, IconRadar2, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { BeaconDashboardActivity } from "@/features/beacon/ui/beacon-dashboard-activity";
import { TowerDashboardUsageSection } from "@/features/billing/ui/tower-dashboard-usage-section";
import { TowerWebflowOAuthPopupButton } from "@/features/tower-ui/tower-webflow-oauth-popup-button";
import type { TowerDashboardSummary } from "@/server/dashboard-summary";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { TowerPageHeader, TowerPageMain, TowerPageSection } from "@/shared/ui/tower-page-shell";

export function TowerDashboard({ summary }: { summary: TowerDashboardSummary }) {
  const shortcutCards = [
    {
      title: "Team",
      description: "Teams, invitations, and member roles for your organization.",
      href: "/team",
      external: false,
      icon: IconUsers,
      action: summary.activeOrgTeamAdmin ? "Manage team" : "View team",
      badge: "Team",
    },
    {
      title: "Beacon",
      description: "Image export presets for the Beacon Webflow app, synced from Tower.",
      href: "/beacon",
      external: false,
      icon: IconRadar2,
      action: "Manage presets",
      badge: "Beacon",
    },
  ] as const;

  return (
    <TowerPageMain>
      <TowerPageHeader
        title="Dashboard"
        description="Connect Webflow, manage your team, and keep Beacon export presets in sync."
        meta={
          <>
            {summary.userEmail ? <span className="font-medium text-foreground">{summary.userEmail}</span> : null}
            {summary.activeOrganizationName ? (
              <>
                <span className="hidden sm:inline" aria-hidden>
                  ·
                </span>
                <span>
                  Active team <span className="font-medium text-foreground">{summary.activeOrganizationName}</span>
                </span>
              </>
            ) : summary.activeOrganizationId ? (
              <>
                <span className="hidden sm:inline" aria-hidden>
                  ·
                </span>
                <span>No active team selected</span>
              </>
            ) : null}
          </>
        }
      />

      <BeaconDashboardActivity />

      <TowerDashboardUsageSection />

      <TowerPageSection title="Your connection">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                <IconPlug aria-hidden className="size-5" stroke={1.5} />
              </div>
              <Badge variant="secondary">Webflow</Badge>
            </div>
            <div>
              <CardTitle>OAuth & sites</CardTitle>
              <CardDescription className="mt-1.5">
                Access available to the Data API proxy for this signed-in account.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">OAuth</span>
              {summary.webflowOAuthConnected ? (
                <Badge variant="default">Connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
              {summary.activeOrgTeamAdmin ? (
                <TowerWebflowOAuthPopupButton>
                  {summary.webflowOAuthConnected ? "Relink Webflow" : "Connect Webflow"}
                </TowerWebflowOAuthPopupButton>
              ) : null}
            </div>
            {summary.webflowOAuthConnected && summary.webflowSites !== null ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Sites</p>
                {summary.webflowSites.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No sites returned (check token scopes).</p>
                ) : (
                  <ul className="max-h-32 space-y-1 overflow-auto text-xs">
                    {summary.webflowSites.slice(0, 12).map((s) => (
                      <li key={s.id} className="truncate font-mono text-muted-foreground">
                        {s.displayName ?? s.id}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TowerPageSection>

      <TowerPageSection title="Shortcuts">
        <div className="grid gap-4 sm:grid-cols-2">
          {shortcutCards.map(({ title, description, href, icon: Icon, action, badge, external }) => (
            <Card key={title} className="flex h-full flex-col">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon aria-hidden className="size-5" stroke={1.5} />
                  </div>
                  <Badge variant="secondary">{badge}</Badge>
                </div>
                <div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription className="mt-1.5">{description}</CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="mt-auto justify-end">
                <Button variant="outline" size="sm" asChild>
                  {external ? (
                    <a href={href} rel="noreferrer" target="_blank">
                      {action}
                    </a>
                  ) : (
                    <Link href={href}>{action}</Link>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </TowerPageSection>
    </TowerPageMain>
  );
}
