import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly set the workspace root to this project directory so Turbopack
    // doesn't get confused by other lockfiles higher in the directory tree.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
