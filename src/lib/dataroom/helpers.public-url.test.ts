import { describe, expect, it, vi } from "vitest";

import { getPublicAppBaseUrl } from "@/lib/dataroom/helpers";

describe("getPublicAppBaseUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL over bogus request.url", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://opendataroom-production.up.railway.app");
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "");

    const req = new Request("http://0.0.0.0:8080/api/vaults", { method: "POST" });
    expect(getPublicAppBaseUrl(req)).toBe("https://opendataroom-production.up.railway.app");

    vi.unstubAllEnvs();
  });

  it("uses RAILWAY_PUBLIC_DOMAIN when request URL is 0.0.0.0", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "opendataroom-production.up.railway.app");

    const req = new Request("http://0.0.0.0:8080/api/vaults");
    expect(getPublicAppBaseUrl(req)).toBe("https://opendataroom-production.up.railway.app");

    vi.unstubAllEnvs();
  });

  it("uses x-forwarded-host when env unset and hostname is public", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "");

    const h = new Headers();
    h.set("x-forwarded-host", "opendataroom-production.up.railway.app");
    h.set("x-forwarded-proto", "https");
    const req = new Request("http://0.0.0.0:8080/api/vaults", { headers: h });
    expect(getPublicAppBaseUrl(req)).toBe("https://opendataroom-production.up.railway.app");

    vi.unstubAllEnvs();
  });

  it("strips trailing slash from NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "");

    const req = new Request("http://0.0.0.0:8080/api/vaults");
    expect(getPublicAppBaseUrl(req)).toBe("https://example.com");

    vi.unstubAllEnvs();
  });
});
