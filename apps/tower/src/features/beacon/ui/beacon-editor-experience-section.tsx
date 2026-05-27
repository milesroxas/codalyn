"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { useState } from "react";
import { toast } from "sonner";
import { BeaconEditorExperienceSkeleton } from "@/features/beacon/ui/beacon-page-skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipDetailNote,
  TooltipDetailSummary,
  TooltipHelpTrigger,
} from "@/shared/ui/tooltip";

type BeaconEditorExperienceSectionProps = {
  enabled?: boolean;
  restrictToEditorExperience: boolean;
  loading?: boolean;
  onUpdated?: () => void | Promise<void>;
};

export function BeaconEditorExperienceSection({
  enabled = true,
  restrictToEditorExperience,
  loading = false,
  onUpdated,
}: BeaconEditorExperienceSectionProps) {
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const designerFeaturesOn = !restrictToEditorExperience;
  const showLoading = useDeferredLoadingIndicator(loading);

  const onToggle = async (nextDesignerOn: boolean) => {
    setSaving(true);
    setLoadError(null);
    try {
      const r = await fetch("/api/v1/beacon/member/editor-experience", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restrictToEditorExperience: !nextDesignerOn }),
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      toast.success("Designer features updated");
      await onUpdated?.();
    } catch {
      setLoadError("Could not update");
      toast.error("Could not update designer features");
    } finally {
      setSaving(false);
    }
  };

  if (!enabled) {
    return null;
  }

  if (showLoading) {
    return <BeaconEditorExperienceSkeleton />;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">Beacon in the Designer</CardTitle>
        <CardDescription>Enable advanced Beacon controls in the Webflow Designer.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Label htmlFor="beacon-designer-features">Designer features</Label>
            <Tooltip>
              <TooltipHelpTrigger label="About designer features for admins" />
              <TooltipContent side="top" variant="detail">
                <TooltipDetailSummary>
                  Turn off if you focus on content rather than site setup. You will see a simpler Beacon panel without
                  configuration controls.
                </TooltipDetailSummary>
                <TooltipDetailNote>
                  Applies only to your account. Team members with the designer role keep full configuration access.
                </TooltipDetailNote>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-muted-foreground">Show configuration options in my Beacon app extension.</p>
        </div>
        <Switch
          id="beacon-designer-features"
          checked={designerFeaturesOn}
          disabled={loading || saving}
          onCheckedChange={(v) => void onToggle(v)}
        />
      </CardContent>
      {loadError ? <p className="px-4 pb-4 text-sm text-destructive">{loadError}</p> : null}
    </Card>
  );
}
