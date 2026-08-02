import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "unicorn", "import", "vitest", "react", "react-perf"],
  categories: {
    suspicious: "warn",
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
  ignorePatterns: ["dist"],
  rules: {
    eqeqeq: "warn",
    "react/react-in-jsx-scope": "off",
    "no-throw-literal": "warn",
    "unicorn/prefer-node-protocol": "warn",
    "typescript/consistent-type-imports": "warn",
  },
});
