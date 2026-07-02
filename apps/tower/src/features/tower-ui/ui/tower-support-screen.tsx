"use client";

import { AuthShell } from "@/features/tower-ui/auth-shell";
import {
  TOWER_SUPPORT_REQUEST_CONFIG,
  type TowerSupportRequestKind,
} from "@/features/tower-ui/lib/tower-support-request";
import { TowerSupportRequestForm } from "@/features/tower-ui/ui/tower-support-request-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const SUPPORT_TABS: { value: TowerSupportRequestKind; label: string }[] = [
  { value: "help", label: "Get help" },
  { value: "feedback", label: "Feedback" },
];

export function TowerSupportScreen() {
  return (
    <AuthShell contentWidth="md">
      <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight">How can we help?</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Request help or share feedback. We&apos;ll follow up by email.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue={SUPPORT_TABS[0].value}>
            <TabsList variant="segmented">
              {SUPPORT_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {SUPPORT_TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="space-y-4">
                <p className="text-sm text-muted-foreground">{TOWER_SUPPORT_REQUEST_CONFIG[tab.value].description}</p>
                <TowerSupportRequestForm kind={tab.value} variant="page" />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
