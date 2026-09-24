import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  test: {
    globals: true,
    environment: "node",
    fsModuleCache: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    slowTestThreshold: 10000,
  },
});
