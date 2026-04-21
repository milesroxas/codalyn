"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

type BeaconEditorExperienceSectionProps = {
  enabled: boolean;
};

export function BeaconEditorExperienceSection({ enabled }: BeaconEditorExperienceSectionProps) {
  const [checked, setChecked] = useState(false);
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
      setChecked(Boolean(data.restrictToEditorExperience));
    } catch {
      setLoadError("Could not load Beacon settings");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async (next: boolean) => {
    setSaving(true);
    setLoadError(null);
    try {
      const r = await fetch("/api/v1/beacon/member/editor-experience", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restrictToEditorExperience: next }),
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      setChecked(next);
    } catch {
      setLoadError("Could not update");
    } finally {
      setSaving(false);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Beacon in the Designer</CardTitle>
          <CardDescription>
            Team admins can match the editor experience in Beacon (team presets only; advanced preset management
            hidden).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="beacon-editor-mode">Use editor-style Beacon</Label>
            <p className="text-xs text-muted-foreground">
              Off by default. When on, advanced preset controls are hidden.
            </p>
          </div>
          <Switch
            id="beacon-editor-mode"
            checked={checked}
            disabled={loading || saving}
            onCheckedChange={(v) => void onToggle(v)}
          />
        </CardContent>
        {loadError ? <p className="px-6 pb-4 text-sm text-destructive">{loadError}</p> : null}
      </Card>
    </div>
  );
}
