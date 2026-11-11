import { defineConfig } from "oxlint";
export default defineConfig({
  plugins: ["typescript", "unicorn", "import", "vitest", "react", "react-perf"],
  categories: {
    suspicious: "warn",
  },
  rules: {
    eqeqeq: "warn",
    "react/react-in-jsx-scope": "off",
    "import/no-unassigned-import": [
      "warn",
      {
        allow: ["**/globals.css"],
      },
    ],
    "no-throw-literal": "warn",
    "unicorn/prefer-node-protocol": "warn",
    "typescript/consistent-type-imports": "warn",
  },
});
