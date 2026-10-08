import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  test: {
    globals: true,
    environment: "node",
    // Frame assertions match plain text; greenly (and CI) may set FORCE_COLOR=1 on child processes.
    env: { FORCE_COLOR: "0" },
    fsModuleCache: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    slowTestThreshold: 10000,
  },
});
