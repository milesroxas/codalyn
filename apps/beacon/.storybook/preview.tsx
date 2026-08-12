import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview, ReactRenderer } from "@storybook/react-vite";
import { initialize as initializeMsw, mswLoader } from "msw-storybook-addon";
import { TooltipProvider } from "@/shared/ui/tooltip";
import "@/styles/globals.css";
import "./preview.css";
import { beaconAppLoader, withBeaconApp } from "./beacon-app";
import { installWebflowStub } from "./webflow-stub";

// The real app installs this in `src/index.tsx` before mounting; reproduce it so components see a
// safe `webflow` global. Background CSS vars need no setup — globals.css declares them statically.
installWebflowStub();

// Tower is mocked at the network layer (see `tower-mock.ts`); requests to other origins
// (fonts, story assets) pass through untouched.
initializeMsw({ onUnhandledRequest: "bypass" });

const preview: Preview = {
  // Order matters: `beaconAppLoader` seeds storage/Designer overrides before `mswLoader`
  // starts intercepting, so the first provider fetch already hits the persona handlers.
  loaders: [beaconAppLoader, mswLoader],
  decorators: [
    // The design system keys every dark token off `.dark` on <html> (see globals.css), which
    // also covers Radix portals that render outside the story root.
    withThemeByClassName<ReactRenderer>({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "dark",
      parentSelector: "html",
    }),
    // Mirrors the app-level provider in `src/app/app.tsx`.
    (Story) => (
      <TooltipProvider delayDuration={200}>
        <Story />
      </TooltipProvider>
    ),
    // Outermost: wraps stories opted in via `beaconScreen()` in the real app providers.
    withBeaconApp,
  ],
  parameters: {
    layout: "padded",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    // The app body paints its own background (globals.css `--app-bg-image`); the backgrounds
    // toolbar would fight it and lie about what ships.
    backgrounds: { disable: true },
    viewport: {
      options: {
        webflowPanel: {
          name: "Webflow panel (350×800)",
          styles: { width: "350px", height: "800px" },
          type: "mobile",
        },
        webflowPanelComfort: {
          name: "Webflow panel, comfortable (420×900)",
          styles: { width: "420px", height: "900px" },
          type: "mobile",
        },
      },
    },
    options: {
      storySort: {
        order: ["Overview", "App", "CmsSlots", "ImageEditor", "UI"],
      },
    },
  },
  initialGlobals: {
    // Default every story to the real extension panel size (`webflow.setExtensionSize` in the
    // app pins 350×800 — see shared/lib/beacon-extension-size.ts).
    viewport: { value: "webflowPanel", isRotated: false },
  },
  // Generate a docs page for every component without repeating the tag per story file.
  tags: ["autodocs"],
};

export default preview;
