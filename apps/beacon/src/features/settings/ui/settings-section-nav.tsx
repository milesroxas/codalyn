import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/shared/ui/navigation-menu";
import { cn } from "@/shared/lib/utils";

export type SettingsSectionId = "presets" | "preferences" | "account";

const ITEMS: { id: SettingsSectionId; label: string }[] = [
  { id: "presets", label: "Presets" },
  { id: "preferences", label: "Preferences" },
  { id: "account", label: "Account" },
];

export type SettingsSectionNavProps = {
  value: SettingsSectionId;
  onValueChange: (id: SettingsSectionId) => void;
};

export function SettingsSectionNav({ value, onValueChange }: SettingsSectionNavProps) {
  return (
    <nav aria-label="Settings sections" className="w-full min-w-0">
      <NavigationMenu viewport={false} className="max-w-none justify-start">
        <NavigationMenuList className="flex w-full flex-wrap justify-start gap-1 border-border/70 border-b pb-2">
          {ITEMS.map((item) => (
            <NavigationMenuItem key={item.id}>
              <NavigationMenuLink asChild active={value === item.id}>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors",
                    value === item.id && "bg-muted text-foreground"
                  )}
                  onClick={() => {
                    onValueChange(item.id);
                  }}
                >
                  {item.label}
                </button>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </nav>
  );
}
