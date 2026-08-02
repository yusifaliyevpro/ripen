import pluginBabel from "@rolldown/plugin-babel";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "tsdown";

export default defineConfig({
  plugins: [
    pluginBabel({
      presets: [reactCompilerPreset()],
    }),
  ],
  entry: ["src/cli.tsx"],
  format: "esm",
  outDir: "dist",
  clean: true,
  platform: "node",
  outputOptions: {
    entryFileNames: "cli.js",
    comments: false,
  },
});
