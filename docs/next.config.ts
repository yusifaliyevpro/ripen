import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  turbopack: {
    root: import.meta.dirname,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
