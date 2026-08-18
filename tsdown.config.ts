import pluginBabel from "@rolldown/plugin-babel";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, type TsdownPlugin } from "tsdown";

const stripInkDevtools: TsdownPlugin = {
  name: "strip-ink-devtools",
  transform(code, id) {
    if (!id.includes("ink") || !code.includes("process.env['DEV']")) return null;
    return { code: code.replaceAll("process.env['DEV']", "'false'"), map: null };
  },
};

export default defineConfig({
  plugins: [stripInkDevtools, pluginBabel({ presets: [reactCompilerPreset()] })],
  entry: ["src/cli.tsx"],
  format: "esm",
  outDir: "dist",
  clean: true,
  platform: "node",
  target: "node22",
  deps: { onlyBundle: false },
  env: { NODE_ENV: "production" },
  outputOptions: {
    entryFileNames: "cli.js",
    comments: false,
  },
});
