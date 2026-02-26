import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      tailwindcss: path.resolve(process.cwd(), "node_modules/tailwindcss"),
    },
  },
};

export default nextConfig;
