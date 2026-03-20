import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/cli.tsx"],
  format: "esm",
  outDir: "dist",
  clean: true,
  platform: "node",
  outputOptions: {
    entryFileNames: "cli.js",
  },
  deps: {
    neverBundle: ["ink", "ink-scroll-view", "react", "execa"],
  },
});
