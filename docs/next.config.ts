import { join } from "node:path";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  turbopack: {
    // docs is a member of the pnpm workspace at the repo root; pnpm keeps the
    // shared package store in <repo-root>/node_modules/.pnpm, so Turbopack's
    // root must be the monorepo root to resolve hoisted deps like `next`.
    root: join(import.meta.dirname, ".."),
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

export default withMDX(nextConfig);
