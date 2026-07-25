import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "unicorn", "import"],
  categories: {
    suspicious: "warn",
  },
  rules: {
    eqeqeq: "warn",
    "import/no-unassigned-import": "off",
    "no-throw-literal": "warn",
    "unicorn/prefer-node-protocol": "warn",
    "typescript/consistent-type-imports": "warn",
  },
});
