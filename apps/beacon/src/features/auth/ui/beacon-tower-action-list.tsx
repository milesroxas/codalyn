import { ExternalLink, LogOut, type LucideIcon, Plug } from "lucide-react";
import { towerConnectionPathForSite } from "@/features/auth/lib/tower-app-link";
import { useBeaconCurrentSite } from "@/features/auth/lib/use-beacon-current-site";
import { type TowerAppLinkProps, useTowerAppLink } from "@/features/auth/model/use-tower-app-link";
import { cn } from "@/shared/lib/utils";

type BeaconTowerActionListItem = {
  label: string;
  icon: LucideIcon;
  /** Ordinary new-tab link to Tower; `null` when Tower is not configured (row renders disabled). */
  link?: TowerAppLinkProps | null;
  onSelect?: () => void;
  destructive?: boolean;
};

const rowClass = (destructive: boolean | undefined, disabled: boolean) =>
  cn(
    "flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm transition-colors",
    "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    disabled && "pointer-events-none opacity-50",
    destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground"
  );

function BeaconTowerActionListRow(props: { item: BeaconTowerActionListItem }) {
  const { item } = props;
  const Icon = item.icon;
  const icon = (
    <Icon
      aria-hidden
      className={cn(
        "size-4 shrink-0 opacity-60",
        item.destructive ? "text-destructive opacity-80" : "text-muted-foreground"
      )}
    />
  );

  if (item.link) {
    // External destinations are plain anchors (never `window.open`): the browser opens the tab, the
    // extension holds no handle to it.
    return (
      <a {...item.link} className={rowClass(item.destructive, false)}>
        <span className="font-normal">{item.label}</span>
        {icon}
      </a>
    );
  }

  const disabled = item.link === null;
  return (
    <button type="button" disabled={disabled} onClick={item.onSelect} className={rowClass(item.destructive, disabled)}>
      <span className="font-normal">{item.label}</span>
      {icon}
    </button>
  );
}

export type BeaconTowerActionListProps = {
  onSignOut: () => void;
};

export function BeaconTowerActionList(props: BeaconTowerActionListProps) {
  const { onSignOut } = props;
  // Tower's connection screen scoped to the site open in the Designer, so the user can authorize/relink
  // the workspace that owns it instead of landing on the dashboard.
  const { site } = useBeaconCurrentSite();
  const connectLink = useTowerAppLink(towerConnectionPathForSite(site?.siteId));
  const beaconLink = useTowerAppLink("/beacon");
  const accountLink = useTowerAppLink("/account");

  const items: BeaconTowerActionListItem[] = [
    { label: "Connect Webflow site", icon: Plug, link: connectLink },
    { label: "Beacon & presets", icon: ExternalLink, link: beaconLink },
    { label: "Account & security", icon: ExternalLink, link: accountLink },
    { label: "Sign out", icon: LogOut, destructive: true, onSelect: () => void onSignOut() },
  ];

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <BeaconTowerActionListRow key={item.label} item={item} />
      ))}
    </div>
  );
}
