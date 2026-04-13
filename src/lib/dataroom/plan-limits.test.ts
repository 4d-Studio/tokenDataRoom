import { afterEach, describe, expect, it, vi } from "vitest";

describe("plan-limits", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("Personal (plus) allows three rooms", async () => {
    const { PLAN_LIMITS } = await import("@/lib/dataroom/plan-limits");
    expect(PLAN_LIMITS.plus.rooms).toBe(3);
  });

  it("resolveEffectiveWorkspacePlan upgrades comped emails to unicorn", async () => {
    vi.stubEnv("TKN_LIFETIME_PRO_EMAILS", "");
    const { resolveEffectiveWorkspacePlan } = await import("@/lib/dataroom/plan-limits");
    expect(
      resolveEffectiveWorkspacePlan({
        email: "Tarzelf@Proton.me",
        plan: "free",
      }),
    ).toBe("unicorn");
    expect(
      resolveEffectiveWorkspacePlan({
        email: "other@x.com",
        plan: "plus",
      }),
    ).toBe("plus");
  });

  it("TKN_LIFETIME_PRO_EMAILS adds more comped accounts", async () => {
    vi.stubEnv("TKN_LIFETIME_PRO_EMAILS", "vip@example.com");
    const { resolveEffectiveWorkspacePlan } = await import("@/lib/dataroom/plan-limits");
    expect(
      resolveEffectiveWorkspacePlan({
        email: "vip@example.com",
        plan: "free",
      }),
    ).toBe("unicorn");
  });
});
