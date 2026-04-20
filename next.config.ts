import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "pg"],
  outputFileTracingExcludes: {
    "*": ["node_modules/@prisma/engines/**"],
  },
};

export default nextConfig;
