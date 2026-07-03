import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["./overview.mdx", "../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-themes"],
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: {
        // Storybook must NOT load the app's vite.config.ts: that config registers the
        // Webflow Designer extension dev plugin (injects Webflow boot scripts into the
        // served HTML) and shapes build output for the extension bundle. Storybook runs
        // against a dedicated config that reproduces only the browser-relevant pieces.
        viteConfigPath: ".storybook/vite.config.ts",
      },
    },
  },
  // Serves `public/images/*` so the injected `--beacon-*` background URL vars resolve.
  staticDirs: ["../public"],
};

export default config;
