import { buildTowerUsageFeatureGroups, type TowerUsageStatusSnapshot } from "@codalyn/webflow-kit";
import { UsageMeterRow } from "@/shared/ui/usage-meter-row";

type UsageFeatureUsageDisplayProps = {
  status: Pick<TowerUsageStatusSnapshot, "meters" | "designerApiBreakdown">;
};

export function UsageFeatureUsageDisplay(props: UsageFeatureUsageDisplayProps) {
  const { status } = props;
  const groups = buildTowerUsageFeatureGroups(status.meters);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.feature} className="space-y-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-foreground">{group.label}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{group.description}</p>
          </div>
          <div className="space-y-4">
            {group.meters.map((meter) => (
              <UsageMeterRow
                key={meter.kind}
                meter={meter}
                designerApiBreakdown={meter.kind === "webflowProxy" ? status.designerApiBreakdown : null}
              />
            ))}
            {group.feature === "imageUpload" ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Publishing images to CMS collection fields uses Designer API requests in CMS Slots above, not AVIF
                exports.
              </p>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
