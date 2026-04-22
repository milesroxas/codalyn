import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2017",
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "BeaconRuntime",
      formats: ["es", "iife"],
      fileName: (format) => (format === "iife" ? "beacon-runtime.iife.js" : "beacon-runtime.js"),
    },
    rollupOptions: {
      output: { extend: true },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
