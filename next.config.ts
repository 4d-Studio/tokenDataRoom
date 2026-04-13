import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_RELEASE:
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_APP_RELEASE ||
      "dev",
  },
  poweredByHeader: false,
  /** Playwright / tools hitting `127.0.0.1` need dev chunks; Next 16 blocks cross-origin HMR by default. */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
