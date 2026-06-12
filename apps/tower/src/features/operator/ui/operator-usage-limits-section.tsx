"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import type { OperatorUsageLimitsPatch, OperatorUsageLimitsView } from "@/server/operator/types";
import { formatUsageRatio, meteringStatusLabel, usageTierLabel } from "@/shared/lib/usage-display";
import { parseOptionalLimitInteger } from "@/shared/lib/usage-limit-input";
import {
  USAGE_METER_COUNT_KEY,
  USAGE_METER_EFFECTIVE_LIMIT_KEY,
  USAGE_METER_KINDS,
  usageMeterLabel,
} from "@/shared/lib/usage-meter-chart";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField, FormFieldGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { UsageMeterLabel } from "@/shared/ui/usage-meter-label";

type OperatorUsageLimitsSectionProps = {
  scope: OperatorUsageLimitsView["scope"];
  usage: OperatorUsageLimitsView;
  busy?: boolean;
  onSave: (patch: OperatorUsageLimitsPatch) => Promise<OperatorUsageLimitsView>;
  onReset: () => Promise<OperatorUsageLimitsView>;
};

function limitDraftValue(value: number | null): string {
  return value === null ? "" : String(value);
}

export function OperatorUsageLimitsSection(props: OperatorUsageLimitsSectionProps) {
  const { scope, usage, busy = false, onSave, onReset } = props;
  const [meteringEnabledDraft, setMeteringEnabledDraft] = useState(usage.meteringEnabled);
  const [webflowProxyLimitDraft, setWebflowProxyLimitDraft] = useState(
    limitDraftValue(usage.webflowProxyLimitOverride)
  );
  const [cmsWriteLimitDraft, setCmsWriteLimitDraft] = useState(limitDraftValue(usage.cmsWriteLimitOverride));
  const [imageLimitDraft, setImageLimitDraft] = useState(limitDraftValue(usage.imageOptimizeLimitOverride));
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    setMeteringEnabledDraft(usage.meteringEnabled);
    setWebflowProxyLimitDraft(limitDraftValue(usage.webflowProxyLimitOverride));
    setCmsWriteLimitDraft(limitDraftValue(usage.cmsWriteLimitOverride));
    setImageLimitDraft(limitDraftValue(usage.imageOptimizeLimitOverride));
  }, [usage]);

  const dirty = useMemo(() => {
    const webflowProxyNext = parseOptionalLimitInteger(webflowProxyLimitDraft);
    const cmsWriteNext = parseOptionalLimitInteger(cmsWriteLimitDraft);
    const imageNext = parseOptionalLimitInteger(imageLimitDraft);
    if (webflowProxyNext === "invalid" || cmsWriteNext === "invalid" || imageNext === "invalid") {
      return false;
    }
    return (
      meteringEnabledDraft !== usage.meteringEnabled ||
      webflowProxyNext !== usage.webflowProxyLimitOverride ||
      cmsWriteNext !== usage.cmsWriteLimitOverride ||
      imageNext !== usage.imageOptimizeLimitOverride
    );
  }, [usage, meteringEnabledDraft, webflowProxyLimitDraft, cmsWriteLimitDraft, imageLimitDraft]);

  const onSaveLimits = useCallback(async () => {
    const webflowProxyNext = parseOptionalLimitInteger(webflowProxyLimitDraft);
    const cmsWriteNext = parseOptionalLimitInteger(cmsWriteLimitDraft);
    const imageNext = parseOptionalLimitInteger(imageLimitDraft);
    if (webflowProxyNext === "invalid" || cmsWriteNext === "invalid" || imageNext === "invalid") {
      toast.error("Limit overrides must be blank or a non-negative integer.");
      return;
    }
    setActionBusy(true);
    try {
      await onSave({
        meteringEnabled: meteringEnabledDraft,
        webflowProxyLimitOverride: webflowProxyNext,
        cmsWriteLimitOverride: cmsWriteNext,
        imageOptimizeLimitOverride: imageNext,
      });
      toast.success("Usage limits updated");
    } catch (err) {
      toast.error(err instanceof OperatorApiError ? err.message : "Update failed");
    } finally {
      setActionBusy(false);
    }
  }, [webflowProxyLimitDraft, cmsWriteLimitDraft, imageLimitDraft, meteringEnabledDraft, onSave]);

  const onResetUsage = useCallback(async () => {
    setActionBusy(true);
    try {
      await onReset();
      toast.success(scope === "workspace" ? "Workspace pool and member usage reset" : "Usage reset");
    } catch (err) {
      toast.error(err instanceof OperatorApiError ? err.message : "Reset failed");
    } finally {
      setActionBusy(false);
    }
  }, [onReset, scope]);

  const disabled = busy || actionBusy;
  const status = meteringStatusLabel({
    meteringEnabled: usage.meteringEnabled,
    globalMeteringDisabled: usage.globalMeteringDisabled,
    tier: usage.tier,
  });

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Usage limits</h3>
      <div className="space-y-4 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === "Metered" ? "outline" : "secondary"}>{status}</Badge>
          <Badge variant="outline">Tier: {usage.tier}</Badge>
          <Badge variant="outline">{usage.yearMonth}</Badge>
          {usage.globalMeteringDisabled ? <Badge variant="secondary">Global metering off</Badge> : null}
        </div>

        {scope === "user" ? (
          <dl className="grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">
                <UsageMeterLabel kind="webflowProxy" />
              </dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.webflowProxyRequestCount, usage.effectiveWebflowProxyLimit)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <UsageMeterLabel kind="cmsWrite" />
              </dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.cmsWriteCount, usage.effectiveCmsWriteLimit)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <UsageMeterLabel kind="image" />
              </dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.imageOptimizeCount, usage.effectiveImageLimit)}
              </dd>
            </div>
          </dl>
        ) : (
          <dl className="grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">
                <UsageMeterLabel kind="webflowProxy" label="Workspace pool" />
              </dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.webflowProxyRequestCount, usage.effectiveWebflowProxyLimit)}
              </dd>
              <p className="text-[10px] text-muted-foreground">
                Members (sum): {usage.memberWebflowProxyRequestCount ?? 0}
              </p>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <UsageMeterLabel kind="cmsWrite" label="Workspace pool" />
              </dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.cmsWriteCount, usage.effectiveCmsWriteLimit)}
              </dd>
              <p className="text-[10px] text-muted-foreground">Members (sum): {usage.memberCmsWriteCount ?? 0}</p>
            </div>
            <div>
              <dt className="text-muted-foreground">
                <UsageMeterLabel kind="image" label="Workspace pool" />
              </dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.imageOptimizeCount, usage.effectiveImageLimit)}
              </dd>
              <p className="text-[10px] text-muted-foreground">Members (sum): {usage.memberImageOptimizeCount ?? 0}</p>
            </div>
          </dl>
        )}

        <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/20 p-3">
          <div className="space-y-0.5">
            <Label htmlFor={`${scope}-metering-enabled`} className="text-sm font-medium">
              Enforce monthly limits
            </Label>
            <p className="text-xs text-muted-foreground">
              When off, {scope === "workspace" ? "members with this workspace active" : "this account"} bypasses
              metering even on the free tier.
            </p>
          </div>
          <Switch
            id={`${scope}-metering-enabled`}
            checked={meteringEnabledDraft}
            onCheckedChange={setMeteringEnabledDraft}
            disabled={disabled || usage.globalMeteringDisabled}
          />
        </div>

        <FormFieldGrid className="sm:grid-cols-3">
          <FormField>
            <Label htmlFor={`${scope}-webflow-proxy-limit`}>
              <UsageMeterLabel kind="webflowProxy" label="Webflow proxy cap override" />
            </Label>
            <Input
              id={`${scope}-webflow-proxy-limit`}
              type="number"
              min={0}
              step={1}
              placeholder="Tier default"
              value={webflowProxyLimitDraft}
              onChange={(event) => setWebflowProxyLimitDraft(event.target.value)}
              disabled={disabled}
            />
          </FormField>
          <FormField>
            <Label htmlFor={`${scope}-cms-write-limit`}>
              <UsageMeterLabel kind="cmsWrite" label="CMS write cap override" />
            </Label>
            <Input
              id={`${scope}-cms-write-limit`}
              type="number"
              min={0}
              step={1}
              placeholder="Tier default"
              value={cmsWriteLimitDraft}
              onChange={(event) => setCmsWriteLimitDraft(event.target.value)}
              disabled={disabled}
            />
          </FormField>
          <FormField>
            <Label htmlFor={`${scope}-image-limit`}>
              <UsageMeterLabel kind="image" label="Image cap override" />
            </Label>
            <Input
              id={`${scope}-image-limit`}
              type="number"
              min={0}
              step={1}
              placeholder="Tier default"
              value={imageLimitDraft}
              onChange={(event) => setImageLimitDraft(event.target.value)}
              disabled={disabled}
            />
          </FormField>
        </FormFieldGrid>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {scope === "workspace"
              ? "Blank overrides inherit the pooled tier default (per-seat cap × paid seats). A workspace override sets the absolute pooled cap."
              : "Blank overrides inherit tier defaults. User overrides win over workspace overrides."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => void onResetUsage()}
              className="gap-1.5"
            >
              <IconRefresh className="size-4" />
              Reset usage
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || !dirty}
              onClick={() => void onSaveLimits()}
            >
              Save limits
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function reloadUserUsageLimits(userId: string): Promise<OperatorUsageLimitsView> {
  const detail = await operatorApi.getUser(userId);
  return detail.usage;
}

export async function reloadWorkspaceUsageLimits(orgId: string): Promise<OperatorUsageLimitsView> {
  const detail = await operatorApi.getWorkspace(orgId);
  return detail.usage;
}

export function OperatorUsageLimitsTableCell({ usage }: { usage: OperatorUsageLimitsView }) {
  const status = meteringStatusLabel({
    meteringEnabled: usage.meteringEnabled,
    globalMeteringDisabled: usage.globalMeteringDisabled,
    tier: usage.tier,
  });

  // Unpaid workspaces meter usage on each member's user row, not a workspace pool.
  if (usage.scope === "workspace" && usage.tier !== "team") {
    return (
      <div className="space-y-1 text-xs">
        <div className="flex flex-wrap gap-1">
          <Badge variant={status === "Metered" ? "outline" : "secondary"} className="font-normal">
            {status}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {usageTierLabel(usage.tier)}
          </Badge>
        </div>
        <p className="text-muted-foreground">Metered per member account</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex flex-wrap gap-1">
        <Badge variant={status === "Metered" ? "outline" : "secondary"} className="font-normal">
          {status}
        </Badge>
        <Badge variant="outline" className="font-normal">
          {usageTierLabel(usage.tier)}
        </Badge>
        <Badge variant="outline" className="font-normal font-mono">
          {usage.yearMonth}
        </Badge>
      </div>
      {USAGE_METER_KINDS.map((kind) => (
        <p key={kind} className="font-mono tabular-nums text-muted-foreground">
          <span className="text-foreground/90">{usageMeterLabel(kind)}:</span>{" "}
          {formatUsageRatio(usage[USAGE_METER_COUNT_KEY[kind]], usage[USAGE_METER_EFFECTIVE_LIMIT_KEY[kind]])}
        </p>
      ))}
    </div>
  );
}
