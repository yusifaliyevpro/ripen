import { defineConfig } from "greenly";

export default defineConfig({
  name: "ripen CLI",
  checks: [
    { name: "TypeScript", command: "pnpm tsc --noEmit" },
    { name: "Oxfmt", command: "pnpm fmt:check", onFail: "pnpm fmt" },
    { name: "Oxlint", command: "pnpm oxlint" },
    { name: "Build", command: "pnpm build" },
  ],
});
