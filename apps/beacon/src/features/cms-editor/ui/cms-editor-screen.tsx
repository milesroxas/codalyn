import { buildInfo } from "@/shared/lib/build-info";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

/**
 * Placeholder for CMS editor tools (collections, items, field editing).
 * Shown when extended Beacon features are enabled and the user opens the Editor route.
 */
export function CmsEditorScreen() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4" data-version={buildInfo.version}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CMS editor</CardTitle>
          <CardDescription>
            Collection and item editing will appear here. Use Images for image tools; Settings apply across Beacon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="m-0 text-sm text-muted-foreground">This surface is under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}
