"use client";

import { IconGauge } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import type { OperatorPlatformMeteringConfig } from "@/server/operator/types";
import { limitIntegerToDraft, parseRequiredLimitInteger } from "@/shared/lib/usage-limit-input";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { Switch } from "@/shared/ui/switch";

type DraftState = {
  globalMeteringEnabled: boolean;
  freeWebflow: string;
  freeImage: string;
  proWebflow: string;
  proImage: string;
};

function configToDraft(config: OperatorPlatformMeteringConfig): DraftState {
  return {
    globalMeteringEnabled: config.globalMeteringEnabled,
    freeWebflow: limitIntegerToDraft(config.free.webflowRequestsPerMonth),
    freeImage: limitIntegerToDraft(config.free.imageOptimizesPerMonth),
    proWebflow: limitIntegerToDraft(config.pro.webflowRequestsPerMonth),
    proImage: limitIntegerToDraft(config.pro.imageOptimizesPerMonth),
  };
}

function TierLimitFields({
  tierLabel,
  webflowId,
  imageId,
  webflowValue,
  imageValue,
  onWebflowChange,
  onImageChange,
  disabled,
}: {
  tierLabel: string;
  webflowId: string;
  imageId: string;
  webflowValue: string;
  imageValue: string;
  onWebflowChange: (next: string) => void;
  onImageChange: (next: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{tierLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={webflowId}>Webflow proxy + CMS writes / month</Label>
          <Input
            id={webflowId}
            type="number"
            min={0}
            step={1}
            value={webflowValue}
            onChange={(event) => onWebflowChange(event.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={imageId}>Image optimize (AVIF) / month</Label>
          <Input
            id={imageId}
            type="number"
            min={0}
            step={1}
            value={imageValue}
            onChange={(event) => onImageChange(event.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

type DraftPatch = {
  globalMeteringEnabled: boolean;
  free: { webflowRequestsPerMonth: number; imageOptimizesPerMonth: number };
  pro: { webflowRequestsPerMonth: number; imageOptimizesPerMonth: number };
};

function parseDraftPatch(draft: DraftState): DraftPatch | "invalid" {
  const freeWebflow = parseRequiredLimitInteger(draft.freeWebflow);
  const freeImage = parseRequiredLimitInteger(draft.freeImage);
  const proWebflow = parseRequiredLimitInteger(draft.proWebflow);
  const proImage = parseRequiredLimitInteger(draft.proImage);
  if (freeWebflow === "invalid" || freeImage === "invalid" || proWebflow === "invalid" || proImage === "invalid") {
    return "invalid";
  }
  return {
    globalMeteringEnabled: draft.globalMeteringEnabled,
    free: {
      webflowRequestsPerMonth: freeWebflow,
      imageOptimizesPerMonth: freeImage,
    },
    pro: {
      webflowRequestsPerMonth: proWebflow,
      imageOptimizesPerMonth: proImage,
    },
  };
}

function isDraftDirty(config: OperatorPlatformMeteringConfig, draft: DraftState): boolean {
  const parsed = parseDraftPatch(draft);
  if (parsed === "invalid") {
    return false;
  }
  return (
    parsed.globalMeteringEnabled !== config.globalMeteringEnabled ||
    parsed.free.webflowRequestsPerMonth !== config.free.webflowRequestsPerMonth ||
    parsed.free.imageOptimizesPerMonth !== config.free.imageOptimizesPerMonth ||
    parsed.pro.webflowRequestsPerMonth !== config.pro.webflowRequestsPerMonth ||
    parsed.pro.imageOptimizesPerMonth !== config.pro.imageOptimizesPerMonth
  );
}

function PlatformMeteringFormBody({
  config,
  draft,
  disabled,
  onDraftChange,
}: {
  config: OperatorPlatformMeteringConfig;
  draft: DraftState;
  disabled: boolean;
  onDraftChange: (next: DraftState) => void;
}) {
  const globalOff = config.envEmergencyMeteringDisabled || !config.globalMeteringEnabled;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={globalOff ? "secondary" : "outline"}>
          {globalOff ? "Unmetered globally" : "Metering active"}
        </Badge>
        {config.envEmergencyMeteringDisabled ? (
          <Badge variant="destructive">Env emergency override active</Badge>
        ) : null}
        {config.updatedAt ? (
          <Badge variant="outline">Updated {new Date(config.updatedAt).toLocaleString()}</Badge>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <Label htmlFor="platform-global-metering" className="text-sm font-medium">
            Enforce global monthly limits
          </Label>
          <p className="text-xs text-muted-foreground">
            When off, free-tier accounts are not capped unless a customer or workspace override re-enables metering.
          </p>
        </div>
        <Switch
          id="platform-global-metering"
          checked={draft.globalMeteringEnabled}
          onCheckedChange={(next) => onDraftChange({ ...draft, globalMeteringEnabled: next })}
          disabled={disabled || config.envEmergencyMeteringDisabled}
        />
      </div>

      {config.envEmergencyMeteringDisabled ? (
        <p className="text-xs text-muted-foreground">
          Deploy env <code className="font-mono">TOWER_METERING_DISABLED=1</code> is forcing metering off. Remove it to
          allow Operator control again.
        </p>
      ) : null}

      <Separator />

      <TierLimitFields
        tierLabel="Free tier defaults"
        webflowId="platform-free-webflow"
        imageId="platform-free-image"
        webflowValue={draft.freeWebflow}
        imageValue={draft.freeImage}
        onWebflowChange={(next) => onDraftChange({ ...draft, freeWebflow: next })}
        onImageChange={(next) => onDraftChange({ ...draft, freeImage: next })}
        disabled={disabled}
      />

      <Separator />

      <TierLimitFields
        tierLabel="Pro tier display defaults"
        webflowId="platform-pro-webflow"
        imageId="platform-pro-image"
        webflowValue={draft.proWebflow}
        imageValue={draft.proImage}
        onWebflowChange={(next) => onDraftChange({ ...draft, proWebflow: next })}
        onImageChange={(next) => onDraftChange({ ...draft, proImage: next })}
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        Pro usage is not incremented in Tower; these values appear on billing and operator views only.
      </p>
    </>
  );
}

export function OperatorPlatformMeteringCard() {
  const [config, setConfig] = useState<OperatorPlatformMeteringConfig | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await operatorApi.getPlatformMetering();
      setConfig(next);
      setDraft(configToDraft(next));
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : "Could not load platform metering");
      setConfig(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!config || !draft) {
      return false;
    }
    return isDraftDirty(config, draft);
  }, [config, draft]);

  const onSave = useCallback(async () => {
    if (!draft) {
      return;
    }
    const patch = parseDraftPatch(draft);
    if (patch === "invalid") {
      toast.error("Tier limits must be non-negative integers.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const next = await operatorApi.patchPlatformMetering(patch);
      setConfig(next);
      setDraft(configToDraft(next));
      toast.success("Platform metering updated");
    } catch (err) {
      const msg = err instanceof OperatorApiError ? err.message : "Update failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const disabled = loading || saving || !draft;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconGauge className="size-5 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Global tier limits</CardTitle>
        </div>
        <CardDescription>
          Default monthly caps for every account and workspace. Per-customer overrides still apply on top of these
          values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}
        {!loading && error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {!loading && draft && config ? (
          <PlatformMeteringFormBody config={config} draft={draft} disabled={disabled} onDraftChange={setDraft} />
        ) : null}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={loading || saving} onClick={() => void load()}>
          Refresh
        </Button>
        <Button type="button" size="sm" disabled={disabled || !dirty} onClick={() => void onSave()}>
          {saving ? "Saving…" : "Save defaults"}
        </Button>
      </CardFooter>
    </Card>
  );
}
