import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Molstar ships complex ESM with circular deps that trip up Next.js's
  // Turbopack client runtime. Transpiling it through SWC resolves the
  // "module factory not available" error on model pages.
  transpilePackages: ["molstar"],
};

export default nextConfig;
