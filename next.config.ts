import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep the dev tools "N" badge off the sidebar footer (Logout / signed-in row).
  devIndicators: {
    position: "bottom-right",
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    /** Large encrypted uploads from the create-room flow (server actions / app defaults). */
    serverActions: {
      bodySizeLimit: "64mb",
    },
  },
};

export default nextConfig;
