import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 120,
  singleQuote: false,
  insertFinalNewline: true,
  sortTailwindcss: {
    stylesheet: "./src/app/globals.css",
    functions: ["clsx", "cn"],
    attributes: ["classNames", "tw"],
  },
  sortImports: {
    newlinesBetween: false,
  },
});
