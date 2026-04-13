import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isPostgresAuthConfigured,
  readAuthStateFromPostgres,
  writeAuthStateToPostgres,
  type AuthStateSnapshot,
} from "@/lib/dataroom/postgres-auth-state";
import type { WorkspaceRoomSummary } from "@/lib/dataroom/workspace-types";
import type { VaultEvent } from "@/lib/dataroom/types";

import type { WorkspacePlan } from "@/lib/dataroom/plan-limits";

export type TknUser = {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
  workspaceId?: string;
  plan: WorkspacePlan;
};

export type WorkspaceRecord = {
  id: string;
  userId: string;
  name: string;
  companyName: string;
  createdAt: string;
  ndaTemplate?: string;
  logoUrl?: string;
};

/** Recipient acceptance of workspace-wide NDA (covers all rooms in the workspace). */
export type WorkspaceGuestAcceptanceRecord = {
  id: string;
  workspaceId: string;
  acceptedAt: string;
  ndaVersion: string;
  signerName: string;
  signerEmail: string;
  signerCompany?: string;
  signerAddress: string;
  signatureName: string;
  userAgent?: string;
  ipAddress?: string;
};

export type { WorkspaceRoomSummary } from "@/lib/dataroom/workspace-types";

type LoginCodeRecord = {
  email: string;
  codeHash: string;
  expiresAt: string;
  requestedAt: string;
};

export type AuthState = {
  users: TknUser[];
  workspaces: WorkspaceRecord[];
  rooms: WorkspaceRoomSummary[];
  codes: LoginCodeRecord[];
  workspaceGuestAcceptances: WorkspaceGuestAcceptanceRecord[];
};

const authRoot = path.join(process.cwd(), ".dataroom", "auth");
const authStatePath = path.join(authRoot, "state.json");

const emptyState = (): AuthState => ({
  users: [],
  workspaces: [],
  rooms: [],
  codes: [],
  workspaceGuestAcceptances: [],
});

const hashCode = (code: string) =>
  createHash("sha256").update(code).digest("hex");

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

const ensureRoot = async () => {
  await mkdir(authRoot, { recursive: true });
};

const readState = async (): Promise<AuthState> => {
  if (isPostgresAuthConfigured()) {
    const snap = await readAuthStateFromPostgres();
    return snap as AuthState;
  }

  await ensureRoot();

  try {
    const raw = await readFile(authStatePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      users: parsed.users ?? [],
      workspaces: parsed.workspaces ?? [],
      rooms: parsed.rooms ?? [],
      codes: parsed.codes ?? [],
      workspaceGuestAcceptances: parsed.workspaceGuestAcceptances ?? [],
    };
  } catch {
    return emptyState();
  }
};

const writeState = async (state: AuthState) => {
  if (isPostgresAuthConfigured()) {
    await writeAuthStateToPostgres(state as AuthStateSnapshot);
    return;
  }

  await ensureRoot();
  await writeFile(authStatePath, JSON.stringify(state, null, 2), "utf8");
};

export const createLoginCode = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  const state = await readState();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  state.codes = state.codes.filter(
    (record) =>
      record.email !== normalizedEmail &&
      new Date(record.expiresAt).getTime() > now.getTime(),
  );
  state.codes.push({
    email: normalizedEmail,
    codeHash: hashCode(code),
    expiresAt,
    requestedAt: now.toISOString(),
  });

  await writeState(state);

  return { code, expiresAt };
};

export const verifyLoginCode = async (email: string, code: string) => {
  const normalizedEmail = normalizeEmail(email);
  const state = await readState();
  const now = Date.now();
  const matching = state.codes.find(
    (record) =>
      record.email === normalizedEmail &&
      record.codeHash === hashCode(code) &&
      new Date(record.expiresAt).getTime() > now,
  );

  if (!matching) {
    return null;
  }

  state.codes = state.codes.filter((record) => record.email !== normalizedEmail);

  let user = state.users.find((record) => record.email === normalizedEmail);

  if (!user) {
    user = {
      id: randomUUID(),
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      plan: "free",
    };
    state.users.push(user);
  } else {
    user.lastLoginAt = new Date().toISOString();
  }

  await writeState(state);

  return user;
};

export const getUserById = async (userId: string) => {
  const state = await readState();
  return state.users.find((user) => user.id === userId) ?? null;
};

export const updateUserPlan = async (userId: string, plan: TknUser["plan"]) => {
  const state = await readState();
  const user = state.users.find((u) => u.id === userId);
  if (!user) return null;
  user.plan = plan;
  await writeState(state);
  return user;
};

export type { PlanLimits } from "@/lib/dataroom/plan-limits";
export { PLAN_LIMITS, getPlanLimits } from "@/lib/dataroom/plan-limits";

export const getWorkspaceForUser = async (userId: string) => {
  const state = await readState();
  return state.workspaces.find((workspace) => workspace.userId === userId) ?? null;
};

export const getWorkspaceById = async (workspaceId: string) => {
  const state = await readState();
  return state.workspaces.find((w) => w.id === workspaceId) ?? null;
};

export const saveWorkspaceGuestAcceptance = async (
  record: WorkspaceGuestAcceptanceRecord,
) => {
  const state = await readState();
  state.workspaceGuestAcceptances = state.workspaceGuestAcceptances.filter(
    (a) => !(a.workspaceId === record.workspaceId && a.id === record.id),
  );
  state.workspaceGuestAcceptances.unshift(record);
  await writeState(state);
};

export const listRoomsForWorkspace = async (workspaceId: string) => {
  const state = await readState();
  return state.rooms
    .filter((room) => room.workspaceId === workspaceId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const createWorkspaceForUser = async (
  userId: string,
  input: { name: string; companyName: string },
) => {
  const state = await readState();
  const existing = state.workspaces.find((workspace) => workspace.userId === userId);

  if (existing) {
    return existing;
  }

  const workspace = {
    id: randomUUID(),
    userId,
    name: input.name.trim(),
    companyName: input.companyName.trim(),
    createdAt: new Date().toISOString(),
  } satisfies WorkspaceRecord;

  state.workspaces.push(workspace);

  const user = state.users.find((entry) => entry.id === userId);

  if (user) {
    user.workspaceId = workspace.id;
  }

  await writeState(state);

  return workspace;
};

export const addRoomToWorkspace = async (
  workspaceId: string,
  room: Omit<WorkspaceRoomSummary, "workspaceId">,
) => {
  const state = await readState();
  state.rooms = state.rooms.filter((existing) => existing.id !== room.id);
  state.rooms.push({
    workspaceId,
    ...room,
  });
  await writeState(state);
};

export const updateWorkspace = async (
  workspaceId: string,
  patch: Partial<Pick<WorkspaceRecord, "name" | "companyName" | "ndaTemplate" | "logoUrl">>,
) => {
  const state = await readState();
  const workspace = state.workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;

  if (patch.name !== undefined) workspace.name = patch.name.trim();
  if (patch.companyName !== undefined) workspace.companyName = patch.companyName.trim();
  if (patch.ndaTemplate !== undefined) workspace.ndaTemplate = patch.ndaTemplate.trim() || undefined;
  if (patch.logoUrl !== undefined) workspace.logoUrl = patch.logoUrl || undefined;

  await writeState(state);
  return workspace;
};

export const removeRoomFromWorkspace = async (
  workspaceId: string,
  roomId: string,
) => {
  const state = await readState();
  state.rooms = state.rooms.filter(
    (entry) => !(entry.workspaceId === workspaceId && entry.id === roomId),
  );
  await writeState(state);
};

export const updateWorkspaceRoomStatus = async (
  workspaceId: string,
  roomId: string,
  status: WorkspaceRoomSummary["status"],
) => {
  const state = await readState();
  const room = state.rooms.find(
    (entry) => entry.workspaceId === workspaceId && entry.id === roomId,
  );

  if (room) {
    room.status = status;
    await writeState(state);
  }
};

export const updateWorkspaceRoomFile = async (
  workspaceId: string,
  roomId: string,
  patch: { fileName: string },
) => {
  const state = await readState();
  const room = state.rooms.find(
    (entry) => entry.workspaceId === workspaceId && entry.id === roomId,
  );

  if (room) {
    room.fileName = patch.fileName;
    await writeState(state);
  }
};

export const deleteUserAccount = async (userId: string) => {
  const state = await readState();
  const user = state.users.find((u) => u.id === userId);
  if (!user) return false;

  const workspaceId = user.workspaceId;

  if (workspaceId) {
    // Delete all vaults in the workspace
    const storage = await import("@/lib/dataroom/storage").then((m) => m.getVaultStorage());
    const workspaceRooms = state.rooms.filter((r) => r.workspaceId === workspaceId);
    for (const room of workspaceRooms) {
      await storage.deleteVault(room.slug);
    }

    // Clean auth state — remove user's workspace, rooms, and guest acceptances
    state.workspaces = state.workspaces.filter((w) => w.id !== workspaceId);
    state.rooms = state.rooms.filter((r) => r.workspaceId !== workspaceId);
    state.workspaceGuestAcceptances = state.workspaceGuestAcceptances.filter(
      (a) => a.workspaceId !== workspaceId,
    );

    // Remove auth state file from disk (local JSON mode only; Postgres row is updated via writeState below)
    if (!isPostgresAuthConfigured()) {
      const localAuthRoot = path.join(process.cwd(), ".dataroom", "auth");
      try {
        await rm(localAuthRoot, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }

  // Remove login codes for this user
  state.codes = state.codes.filter((c) => c.email !== user.email);

  // Remove user
  state.users = state.users.filter((u) => u.id !== userId);

  await writeState(state);
  return true;
};

export type AggregatedVaultEvent = VaultEvent & {
  vaultTitle: string;
  vaultSlug: string;
};

export const aggregateWorkspaceActivity = async (
  workspaceId: string,
  getEvents: (slug: string) => Promise<VaultEvent[]>,
  limit = 10,
): Promise<AggregatedVaultEvent[]> => {
  const rooms = await listRoomsForWorkspace(workspaceId);

  const roomEvents = await Promise.all(
    rooms.map((room) =>
      getEvents(room.slug).then((events) =>
        events.map((event) => ({
          ...event,
          vaultTitle: room.title,
          vaultSlug: room.slug,
        })),
      ),
    ),
  );

  return roomEvents
    .flat()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);
};
