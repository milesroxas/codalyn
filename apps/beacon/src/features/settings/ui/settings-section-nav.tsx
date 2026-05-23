import { cn } from "@/shared/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/shared/ui/navigation-menu";

export type SettingsSectionId = "preferences" | "account";

const ITEMS: { id: SettingsSectionId; label: string }[] = [
  { id: "preferences", label: "Preferences" },
  { id: "account", label: "Account" },
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = ITEMS[0].id;

export type SettingsSectionNavProps = {
  value: SettingsSectionId;
  onValueChange: (id: SettingsSectionId) => void;
};

export function SettingsSectionNav({ value, onValueChange }: SettingsSectionNavProps) {
  return (
    <nav aria-label="Settings sections" className="-mx-3 min-w-0 bg-secondary px-3 py-1.5">
      <NavigationMenu viewport={false} className="max-w-none justify-start">
        <NavigationMenuList className="flex w-full flex-wrap justify-start gap-0.5">
          {ITEMS.map((item) => (
            <NavigationMenuItem key={item.id}>
              <NavigationMenuLink asChild active={value === item.id} className="h-auto p-0">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-7 items-center rounded-sm px-2 py-0 text-xs font-medium text-muted-foreground transition-colors",
                    value === item.id && "bg-background text-foreground"
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
