import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Keep the dev tools "N" badge off the sidebar footer (Logout / signed-in row).
  devIndicators: {
    position: "bottom-right",
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
