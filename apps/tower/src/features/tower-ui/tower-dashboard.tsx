import { IconActivity, IconBook, IconPlug, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import type { TowerDashboardSummary } from "@/server/dashboard-summary";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

const shortcutCards = [
  {
    title: "Team",
    description: "Workspaces, invitations, and member roles for your organization.",
    href: "/team",
    external: false,
    icon: IconUsers,
    action: "Manage team",
    badge: "Tenant",
  },
  {
    title: "Health API",
    description: "JSON status for monitors and deploy verification.",
    href: "/api/health",
    external: false,
    icon: IconActivity,
    action: "View response",
    badge: "Ops",
  },
  {
    title: "Data API docs",
    description: "REST reference for the Webflow Data API used by Beacon and Tower.",
    href: "https://developers.webflow.com/data/reference/rest-introduction",
    external: true,
    icon: IconBook,
    action: "Open docs",
    badge: "Docs",
  },
] as const;

export function TowerDashboard({ summary }: { summary: TowerDashboardSummary }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Tower</p>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
        <p className="max-w-2xl text-muted-foreground">
          Connect Webflow, coordinate your team, and use the Data API gateway for Beacon and automation.
        </p>
      </div>

      <Separator className="my-8" />

      <section className="mb-10 space-y-3">
        <h2 className="text-sm font-medium text-foreground">Your connection</h2>
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
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">Account</span> {summary.userEmail ?? "—"}
              </span>
              <span>
                <span className="font-medium text-foreground">Active org</span>{" "}
                {summary.activeOrganizationName ?? (summary.activeOrganizationId ? "—" : "None active")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">OAuth</span>
              {summary.webflowOAuthConnected ? (
                <Badge variant="default">Connected</Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
              {!summary.webflowOAuthConnected ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/api/integrations/webflow/authorize">Connect Webflow</Link>
                </Button>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Shortcuts</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>

      {summary.isProductAdmin ? (
        <>
          <Separator className="my-10" />
          <div className="rounded-xl border border-dashed border-amber-500/35 bg-amber-500/6 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-widest text-amber-700 dark:text-amber-500/90">
                  Operator
                </p>
                <p className="text-sm text-muted-foreground">
                  Product and platform tools are separate from this workspace. Open the operator console to manage the
                  SaaS.
                </p>
              </div>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/console">Open operator</Link>
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
