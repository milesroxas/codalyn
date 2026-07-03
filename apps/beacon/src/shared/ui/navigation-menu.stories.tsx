import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/shared/ui/navigation-menu";

const meta = {
  title: "UI/NavigationMenu",
  component: NavigationMenu,
  args: {
    onValueChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-64 w-full justify-start">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NavigationMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Beacon panel nav — Pages and Slots open dropdown panels; Sync is a plain link. */
export const Default: Story = {
  render: (args) => (
    <NavigationMenu {...args}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Pages</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-56 gap-1">
              <li>
                <NavigationMenuLink href="#home">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Home</span>
                    <span className="text-xs text-muted-foreground">4 slots composed</span>
                  </div>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#about">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">About</span>
                    <span className="text-xs text-muted-foreground">2 slots composed</span>
                  </div>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#blog">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Blog — CMS template</span>
                    <span className="text-xs text-muted-foreground">6 slots composed</span>
                  </div>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Slots</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-56 gap-1">
              <li>
                <NavigationMenuLink href="#hero">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Hero image</span>
                    <span className="text-xs text-muted-foreground">2560 × 1440 · synced</span>
                  </div>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#gallery">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Gallery row</span>
                    <span className="text-xs text-muted-foreground">1280 × 960 · draft</span>
                  </div>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#sync">Sync</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

/** `viewport={false}` renders each panel directly under its own trigger instead of a shared viewport. */
export const WithoutViewport: Story = {
  render: (args) => (
    <NavigationMenu {...args} viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Pages</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-48 gap-1">
              <li>
                <NavigationMenuLink href="#home">Home</NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#about">About</NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#pricing">Pricing</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Presets</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-48 gap-1">
              <li>
                <NavigationMenuLink href="#hero-2560">Hero — 2560w</NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#card-1280">Card — 1280w</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#sync">Sync</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};
