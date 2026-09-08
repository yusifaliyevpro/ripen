import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fsModuleCache: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    slowTestThreshold: 10000,
  },
});
