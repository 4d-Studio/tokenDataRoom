import type { MetadataRoute } from "next";

import { getPublicSiteOrigin } from "@/lib/dataroom/public-site";

/** Public marketing and legal URLs only (no app shells or share links). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicSiteOrigin();
  const routes = [
    { path: "", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/pricing", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/privacy", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/terms", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/dpa", changeFrequency: "monthly" as const, priority: 0.5 },
  ];

  const now = new Date();
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
