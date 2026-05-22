"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BeaconEditorExperienceSkeleton } from "@/features/team/ui/team-workspace-panel-skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

type BeaconEditorExperienceSectionProps = {
  enabled: boolean;
};

export function BeaconEditorExperienceSection({ enabled }: BeaconEditorExperienceSectionProps) {
  const [designerFeaturesOn, setDesignerFeaturesOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch("/api/v1/beacon/settings", { credentials: "include" });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      const data = (await r.json()) as { restrictToEditorExperience?: boolean };
      setDesignerFeaturesOn(!data.restrictToEditorExperience);
    } catch {
      setLoadError("Could not load Beacon settings");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

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
      setDesignerFeaturesOn(nextDesignerOn);
      toast.success("Designer features updated");
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

  if (loading) {
    return (
      <div className="mb-8">
        <BeaconEditorExperienceSkeleton />
      </div>
    );
  }

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Beacon in the Designer</CardTitle>
          <CardDescription>
            Preset configuration, manual changes, and related controls. Off by default; turn the switch on to use them
            in Beacon in Webflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="beacon-designer-features">Designer features</Label>
            <p className="text-xs text-muted-foreground">Full Beacon controls in the Webflow panel.</p>
          </div>
          <Switch
            id="beacon-designer-features"
            checked={designerFeaturesOn}
            disabled={loading || saving}
            onCheckedChange={(v) => void onToggle(v)}
          />
        </CardContent>
        {loadError ? <p className="px-6 pb-4 text-sm text-destructive">{loadError}</p> : null}
      </Card>
    </div>
  );
}
