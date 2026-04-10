import type { MetadataRoute } from "next";

import { getPublicSiteOrigin } from "@/lib/dataroom/public-site";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/agent",
          "/login",
          "/m/",
          "/new",
          "/onboarding",
          "/s/",
          "/workspace",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin.replace(/^https?:\/\//, ""),
  };
}
