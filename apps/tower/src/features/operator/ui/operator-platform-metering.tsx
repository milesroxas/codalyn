"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";

import { IconGauge } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import type { OperatorPlatformMeteringConfig } from "@/server/operator/types";
import { limitIntegerToDraft, parseRequiredLimitInteger } from "@/shared/lib/usage-limit-input";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField, FormFieldGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";
import { Switch } from "@/shared/ui/switch";
import { UsageMeterLabel } from "@/shared/ui/usage-meter-label";

type DraftState = {
  globalMeteringEnabled: boolean;
  freeWebflowProxy: string;
  freeCmsWrites: string;
  freeImage: string;
  proWebflowProxy: string;
  proCmsWrites: string;
  proImage: string;
  studioWebflowProxy: string;
  studioCmsWrites: string;
  studioImage: string;
  teamWebflowProxy: string;
  teamCmsWrites: string;
  teamImage: string;
};

function configToDraft(config: OperatorPlatformMeteringConfig): DraftState {
  return {
    globalMeteringEnabled: config.globalMeteringEnabled,
    freeWebflowProxy: limitIntegerToDraft(config.free.webflowProxyRequestsPerMonth),
    freeCmsWrites: limitIntegerToDraft(config.free.cmsWritesPerMonth),
    freeImage: limitIntegerToDraft(config.free.imageOptimizesPerMonth),
    proWebflowProxy: limitIntegerToDraft(config.pro.webflowProxyRequestsPerMonth),
    proCmsWrites: limitIntegerToDraft(config.pro.cmsWritesPerMonth),
    proImage: limitIntegerToDraft(config.pro.imageOptimizesPerMonth),
    studioWebflowProxy: limitIntegerToDraft(config.studio.webflowProxyRequestsPerMonth),
    studioCmsWrites: limitIntegerToDraft(config.studio.cmsWritesPerMonth),
    studioImage: limitIntegerToDraft(config.studio.imageOptimizesPerMonth),
    teamWebflowProxy: limitIntegerToDraft(config.team.webflowProxyRequestsPerMonth),
    teamCmsWrites: limitIntegerToDraft(config.team.cmsWritesPerMonth),
    teamImage: limitIntegerToDraft(config.team.imageOptimizesPerMonth),
  };
}

function TierLimitFields({
  tierLabel,
  webflowProxyId,
  cmsWritesId,
  imageId,
  webflowProxyValue,
  cmsWritesValue,
  imageValue,
  onWebflowProxyChange,
  onCmsWritesChange,
  onImageChange,
  disabled,
}: {
  tierLabel: string;
  webflowProxyId: string;
  cmsWritesId: string;
  imageId: string;
  webflowProxyValue: string;
  cmsWritesValue: string;
  imageValue: string;
  onWebflowProxyChange: (next: string) => void;
  onCmsWritesChange: (next: string) => void;
  onImageChange: (next: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{tierLabel}</p>
      <FormFieldGrid className="sm:grid-cols-3">
        <FormField>
          <Label htmlFor={webflowProxyId}>
            <UsageMeterLabel kind="webflowProxy" label="Webflow proxy / month" />
          </Label>
          <Input
            id={webflowProxyId}
            type="number"
            min={0}
            step={1}
            value={webflowProxyValue}
            onChange={(event) => onWebflowProxyChange(event.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField>
          <Label htmlFor={cmsWritesId}>
            <UsageMeterLabel kind="cmsWrite" label="CMS writes / month" />
          </Label>
          <Input
            id={cmsWritesId}
            type="number"
            min={0}
            step={1}
            value={cmsWritesValue}
            onChange={(event) => onCmsWritesChange(event.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField>
          <Label htmlFor={imageId}>
            <UsageMeterLabel kind="image" label="Image optimization credits / month" />
          </Label>
          <Input
            id={imageId}
            type="number"
            min={0}
            step={1}
            value={imageValue}
            onChange={(event) => onImageChange(event.target.value)}
            disabled={disabled}
          />
        </FormField>
      </FormFieldGrid>
    </div>
  );
}

type DraftPatch = {
  globalMeteringEnabled: boolean;
  free: {
    webflowProxyRequestsPerMonth: number;
    cmsWritesPerMonth: number;
    imageOptimizesPerMonth: number;
  };
  pro: {
    webflowProxyRequestsPerMonth: number;
    cmsWritesPerMonth: number;
    imageOptimizesPerMonth: number;
  };
  studio: {
    webflowProxyRequestsPerMonth: number;
    cmsWritesPerMonth: number;
    imageOptimizesPerMonth: number;
  };
  team: {
    webflowProxyRequestsPerMonth: number;
    cmsWritesPerMonth: number;
    imageOptimizesPerMonth: number;
  };
};

function parseDraftPatch(draft: DraftState): DraftPatch | "invalid" {
  const freeWebflowProxy = parseRequiredLimitInteger(draft.freeWebflowProxy);
  const freeCmsWrites = parseRequiredLimitInteger(draft.freeCmsWrites);
  const freeImage = parseRequiredLimitInteger(draft.freeImage);
  const proWebflowProxy = parseRequiredLimitInteger(draft.proWebflowProxy);
  const proCmsWrites = parseRequiredLimitInteger(draft.proCmsWrites);
  const proImage = parseRequiredLimitInteger(draft.proImage);
  const studioWebflowProxy = parseRequiredLimitInteger(draft.studioWebflowProxy);
  const studioCmsWrites = parseRequiredLimitInteger(draft.studioCmsWrites);
  const studioImage = parseRequiredLimitInteger(draft.studioImage);
  const teamWebflowProxy = parseRequiredLimitInteger(draft.teamWebflowProxy);
  const teamCmsWrites = parseRequiredLimitInteger(draft.teamCmsWrites);
  const teamImage = parseRequiredLimitInteger(draft.teamImage);
  if (
    freeWebflowProxy === "invalid" ||
    freeCmsWrites === "invalid" ||
    freeImage === "invalid" ||
    proWebflowProxy === "invalid" ||
    proCmsWrites === "invalid" ||
    proImage === "invalid" ||
    studioWebflowProxy === "invalid" ||
    studioCmsWrites === "invalid" ||
    studioImage === "invalid" ||
    teamWebflowProxy === "invalid" ||
    teamCmsWrites === "invalid" ||
    teamImage === "invalid"
  ) {
    return "invalid";
  }
  return {
    globalMeteringEnabled: draft.globalMeteringEnabled,
    free: {
      webflowProxyRequestsPerMonth: freeWebflowProxy,
      cmsWritesPerMonth: freeCmsWrites,
      imageOptimizesPerMonth: freeImage,
    },
    pro: {
      webflowProxyRequestsPerMonth: proWebflowProxy,
      cmsWritesPerMonth: proCmsWrites,
      imageOptimizesPerMonth: proImage,
    },
    studio: {
      webflowProxyRequestsPerMonth: studioWebflowProxy,
      cmsWritesPerMonth: studioCmsWrites,
      imageOptimizesPerMonth: studioImage,
    },
    team: {
      webflowProxyRequestsPerMonth: teamWebflowProxy,
      cmsWritesPerMonth: teamCmsWrites,
      imageOptimizesPerMonth: teamImage,
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
    parsed.free.webflowProxyRequestsPerMonth !== config.free.webflowProxyRequestsPerMonth ||
    parsed.free.cmsWritesPerMonth !== config.free.cmsWritesPerMonth ||
    parsed.free.imageOptimizesPerMonth !== config.free.imageOptimizesPerMonth ||
    parsed.pro.webflowProxyRequestsPerMonth !== config.pro.webflowProxyRequestsPerMonth ||
    parsed.pro.cmsWritesPerMonth !== config.pro.cmsWritesPerMonth ||
    parsed.pro.imageOptimizesPerMonth !== config.pro.imageOptimizesPerMonth ||
    parsed.studio.webflowProxyRequestsPerMonth !== config.studio.webflowProxyRequestsPerMonth ||
    parsed.studio.cmsWritesPerMonth !== config.studio.cmsWritesPerMonth ||
    parsed.studio.imageOptimizesPerMonth !== config.studio.imageOptimizesPerMonth ||
    parsed.team.webflowProxyRequestsPerMonth !== config.team.webflowProxyRequestsPerMonth ||
    parsed.team.cmsWritesPerMonth !== config.team.cmsWritesPerMonth ||
    parsed.team.imageOptimizesPerMonth !== config.team.imageOptimizesPerMonth
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
        webflowProxyId="platform-free-webflow-proxy"
        cmsWritesId="platform-free-cms-writes"
        imageId="platform-free-image"
        webflowProxyValue={draft.freeWebflowProxy}
        cmsWritesValue={draft.freeCmsWrites}
        imageValue={draft.freeImage}
        onWebflowProxyChange={(next) => onDraftChange({ ...draft, freeWebflowProxy: next })}
        onCmsWritesChange={(next) => onDraftChange({ ...draft, freeCmsWrites: next })}
        onImageChange={(next) => onDraftChange({ ...draft, freeImage: next })}
        disabled={disabled}
      />

      <Separator />

      <TierLimitFields
        tierLabel="Pro tier defaults (individual subscription)"
        webflowProxyId="platform-pro-webflow-proxy"
        cmsWritesId="platform-pro-cms-writes"
        imageId="platform-pro-image"
        webflowProxyValue={draft.proWebflowProxy}
        cmsWritesValue={draft.proCmsWrites}
        imageValue={draft.proImage}
        onWebflowProxyChange={(next) => onDraftChange({ ...draft, proWebflowProxy: next })}
        onCmsWritesChange={(next) => onDraftChange({ ...draft, proCmsWrites: next })}
        onImageChange={(next) => onDraftChange({ ...draft, proImage: next })}
        disabled={disabled}
      />

      <Separator />

      <TierLimitFields
        tierLabel="Studio tier defaults (individual subscription)"
        webflowProxyId="platform-studio-webflow-proxy"
        cmsWritesId="platform-studio-cms-writes"
        imageId="platform-studio-image"
        webflowProxyValue={draft.studioWebflowProxy}
        cmsWritesValue={draft.studioCmsWrites}
        imageValue={draft.studioImage}
        onWebflowProxyChange={(next) => onDraftChange({ ...draft, studioWebflowProxy: next })}
        onCmsWritesChange={(next) => onDraftChange({ ...draft, studioCmsWrites: next })}
        onImageChange={(next) => onDraftChange({ ...draft, studioImage: next })}
        disabled={disabled}
      />

      <Separator />

      <TierLimitFields
        tierLabel="Team tier defaults (per seat — pooled cap = per-seat × paid seats)"
        webflowProxyId="platform-team-webflow-proxy"
        cmsWritesId="platform-team-cms-writes"
        imageId="platform-team-image"
        webflowProxyValue={draft.teamWebflowProxy}
        cmsWritesValue={draft.teamCmsWrites}
        imageValue={draft.teamImage}
        onWebflowProxyChange={(next) => onDraftChange({ ...draft, teamWebflowProxy: next })}
        onCmsWritesChange={(next) => onDraftChange({ ...draft, teamCmsWrites: next })}
        onImageChange={(next) => onDraftChange({ ...draft, teamImage: next })}
        disabled={disabled}
      />
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
  const showPlaceholder = useDeferredLoadingIndicator(loading);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconGauge className="size-5 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Global tier limits</CardTitle>
        </div>
        <CardDescription>
          Default monthly caps for every account and workspace. Free/Pro/Studio caps apply per individual user; Team
          caps are per seat and pooled across the workspace (pooled cap = per-seat cap × paid seats). Per-customer
          overrides still apply on top of these values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showPlaceholder ? (
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
