import { ExternalLink, LogOut, type LucideIcon, Plug } from "lucide-react";
import { isTowerConfigured, openTowerAppPath, openTowerWebflowConnect } from "@/features/auth/model/tower-auth-client";
import { cn } from "@/shared/lib/utils";

type BeaconTowerActionListItem = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

function BeaconTowerActionListRow(props: { item: BeaconTowerActionListItem }) {
  const { item } = props;
  const Icon = item.icon;

  return (
    <button
      type="button"
      disabled={item.disabled}
      onClick={item.onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        item.destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground"
      )}
    >
      <span className="font-normal">{item.label}</span>
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0 opacity-60",
          item.destructive ? "text-destructive opacity-80" : "text-muted-foreground"
        )}
      />
    </button>
  );
}

export type BeaconTowerActionListProps = {
  onSignOut: () => void;
};

export function BeaconTowerActionList(props: BeaconTowerActionListProps) {
  const { onSignOut } = props;
  const towerConfigured = isTowerConfigured();

  const items: BeaconTowerActionListItem[] = [
    {
      label: "Connect Webflow site",
      icon: Plug,
      disabled: !towerConfigured,
      // Opens Tower's connection screen in a popup, scoped to the site open in the Designer, so the user
      // can authorize/relink the workspace that owns it instead of landing on the dashboard.
      onSelect: () => openTowerWebflowConnect(),
    },
    {
      label: "Beacon & presets",
      icon: ExternalLink,
      disabled: !towerConfigured,
      onSelect: () => openTowerAppPath("/beacon"),
    },
    {
      label: "Account & security",
      icon: ExternalLink,
      disabled: !towerConfigured,
      onSelect: () => openTowerAppPath("/account"),
    },
    {
      label: "Sign out",
      icon: LogOut,
      destructive: true,
      onSelect: () => void onSignOut(),
    },
  ];

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <BeaconTowerActionListRow key={item.label} item={item} />
      ))}
    </div>
  );
}
