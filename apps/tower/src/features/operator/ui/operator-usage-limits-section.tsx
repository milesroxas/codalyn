"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import type { OperatorUsageLimitsPatch, OperatorUsageLimitsView } from "@/server/operator/types";
import { formatUsageRatio, meteringStatusLabel } from "@/shared/lib/usage-display";
import { parseOptionalLimitInteger } from "@/shared/lib/usage-limit-input";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

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
  const [webflowLimitDraft, setWebflowLimitDraft] = useState(limitDraftValue(usage.webflowRequestLimitOverride));
  const [imageLimitDraft, setImageLimitDraft] = useState(limitDraftValue(usage.imageOptimizeLimitOverride));
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    setMeteringEnabledDraft(usage.meteringEnabled);
    setWebflowLimitDraft(limitDraftValue(usage.webflowRequestLimitOverride));
    setImageLimitDraft(limitDraftValue(usage.imageOptimizeLimitOverride));
  }, [usage]);

  const dirty = useMemo(() => {
    const webflowNext = parseOptionalLimitInteger(webflowLimitDraft);
    const imageNext = parseOptionalLimitInteger(imageLimitDraft);
    if (webflowNext === "invalid" || imageNext === "invalid") {
      return false;
    }
    return (
      meteringEnabledDraft !== usage.meteringEnabled ||
      webflowNext !== usage.webflowRequestLimitOverride ||
      imageNext !== usage.imageOptimizeLimitOverride
    );
  }, [usage, meteringEnabledDraft, webflowLimitDraft, imageLimitDraft]);

  const onSaveLimits = useCallback(async () => {
    const webflowNext = parseOptionalLimitInteger(webflowLimitDraft);
    const imageNext = parseOptionalLimitInteger(imageLimitDraft);
    if (webflowNext === "invalid" || imageNext === "invalid") {
      toast.error("Limit overrides must be blank or a non-negative integer.");
      return;
    }
    setActionBusy(true);
    try {
      await onSave({
        meteringEnabled: meteringEnabledDraft,
        webflowRequestLimitOverride: webflowNext,
        imageOptimizeLimitOverride: imageNext,
      });
      toast.success("Usage limits updated");
    } catch (err) {
      toast.error(err instanceof OperatorApiError ? err.message : "Update failed");
    } finally {
      setActionBusy(false);
    }
  }, [webflowLimitDraft, imageLimitDraft, meteringEnabledDraft, onSave]);

  const onResetUsage = useCallback(async () => {
    setActionBusy(true);
    try {
      await onReset();
      toast.success(scope === "workspace" ? "Member usage reset" : "Usage reset");
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
          <Badge variant="outline">UTC {usage.yearMonth}</Badge>
          {usage.globalMeteringDisabled ? <Badge variant="secondary">Global metering off</Badge> : null}
        </div>

        {scope === "user" ? (
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Webflow proxy + CMS writes</dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.webflowRequestCount, usage.effectiveWebflowLimit)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Image optimize (AVIF)</dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.imageOptimizeCount, usage.effectiveImageLimit)}
              </dd>
            </div>
          </dl>
        ) : (
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Member Webflow usage (sum)</dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.memberWebflowRequestCount ?? 0, usage.effectiveWebflowLimit)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Member image usage (sum)</dt>
              <dd className="font-mono text-foreground">
                {formatUsageRatio(usage.memberImageOptimizeCount ?? 0, usage.effectiveImageLimit)}
              </dd>
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${scope}-webflow-limit`}>Webflow cap override</Label>
            <Input
              id={`${scope}-webflow-limit`}
              type="number"
              min={0}
              step={1}
              placeholder="Tier default"
              value={webflowLimitDraft}
              onChange={(event) => setWebflowLimitDraft(event.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${scope}-image-limit`}>Image cap override</Label>
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
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Blank overrides inherit tier defaults. User overrides win over workspace overrides.
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
  const webflowUsed = usage.scope === "workspace" ? (usage.memberWebflowRequestCount ?? 0) : usage.webflowRequestCount;
  const imageUsed = usage.scope === "workspace" ? (usage.memberImageOptimizeCount ?? 0) : usage.imageOptimizeCount;

  return (
    <div className="space-y-1 text-xs">
      <Badge variant={status === "Metered" ? "outline" : "secondary"} className="font-normal">
        {status}
      </Badge>
      <p className="font-mono tabular-nums text-muted-foreground">
        WF {formatUsageRatio(webflowUsed, usage.effectiveWebflowLimit)}
      </p>
      <p className="font-mono tabular-nums text-muted-foreground">
        IMG {formatUsageRatio(imageUsed, usage.effectiveImageLimit)}
      </p>
    </div>
  );
}
