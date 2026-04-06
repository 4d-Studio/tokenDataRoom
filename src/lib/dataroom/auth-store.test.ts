import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

// Stub env before importing auth-store
vi.stubEnv("DATABASE_URL", "");
vi.stubEnv("NODE_ENV", "test");

const TEST_DIR = "/tmp/.test-auth-store-temp";

function cleanDir() {
  try {
    const { rmSync } = require("node:fs");
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch { /* ignore */ }
}

beforeEach(() => {
  cleanDir();
  vi.stubEnv("TKN_LOCAL_DATA_ROOT", TEST_DIR);
  vi.resetModules();
});

afterEach(() => {
  cleanDir();
  vi.resetModules();
});

describe("updateWorkspace logoUrl", () => {
  it("should save and retrieve logoUrl from local JSON state", async () => {
    const {
      createWorkspaceForUser,
      getWorkspaceById,
      updateWorkspace,
    } = await import("./auth-store");

    const userId = crypto.randomUUID();
    const ws = await createWorkspaceForUser(userId, {
      name: "Test Workspace",
      companyName: "Test Co",
    });

    const logoDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const updated = await updateWorkspace(ws.id, { logoUrl: logoDataUrl });
    expect(updated).not.toBeNull();
    expect(updated!.logoUrl).toBe(logoDataUrl);

    const reRead = await getWorkspaceById(ws.id);
    expect(reRead!.logoUrl).toBe(logoDataUrl);
  });

  it("should clear logoUrl when empty string is passed", async () => {
    const { createWorkspaceForUser, getWorkspaceById, updateWorkspace } =
      await import("./auth-store");

    const userId = crypto.randomUUID();
    const ws = await createWorkspaceForUser(userId, {
      name: "Test",
      companyName: "Co",
    });

    await updateWorkspace(ws.id, {
      logoUrl: "data:image/png;base64,xyz",
    });

    const withLogo = await getWorkspaceById(ws.id);
    expect(withLogo!.logoUrl).toBe("data:image/png;base64,xyz");

    await updateWorkspace(ws.id, { logoUrl: "" });
    const withoutLogo = await getWorkspaceById(ws.id);
    expect(withoutLogo!.logoUrl).toBeUndefined();
  });

  it("should not overwrite other workspace fields when updating logoUrl", async () => {
    const { createWorkspaceForUser, getWorkspaceById, updateWorkspace } =
      await import("./auth-store");

    const userId = crypto.randomUUID();
    const ws = await createWorkspaceForUser(userId, {
      name: "My Workspace",
      companyName: "My Company",
    });

    await updateWorkspace(ws.id, {
      logoUrl: "data:image/png;base64,test",
    });

    const reRead = await getWorkspaceById(ws.id);
    expect(reRead!.name).toBe("My Workspace");
    expect(reRead!.companyName).toBe("My Company");
    expect(reRead!.logoUrl).toBe("data:image/png;base64,test");
  });
});
