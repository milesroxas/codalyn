import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview, ReactRenderer } from "@storybook/react-vite";
import { injectBeaconAppBackgroundCssVars } from "@/shared/lib/beacon-app-backgrounds";
import { TooltipProvider } from "@/shared/ui/tooltip";
import "@/styles/globals.css";
import "./preview.css";
import { installWebflowStub } from "./webflow-stub";

// The real app performs both of these in `src/index.tsx` before mounting. Reproduce them so
// components render with the same CSS vars (backgrounds) and a safe `webflow` global.
installWebflowStub();
injectBeaconAppBackgroundCssVars();

const preview: Preview = {
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
        order: ["Overview", "UI"],
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
