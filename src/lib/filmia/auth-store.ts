import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type FilmiaUser = {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
  workspaceId?: string;
};

export type WorkspaceRecord = {
  id: string;
  userId: string;
  name: string;
  companyName: string;
  createdAt: string;
};

export type WorkspaceRoomSummary = {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  fileName: string;
  senderName: string;
  createdAt: string;
  status: "active" | "revoked";
};

type LoginCodeRecord = {
  email: string;
  codeHash: string;
  expiresAt: string;
  requestedAt: string;
};

type AuthState = {
  users: FilmiaUser[];
  workspaces: WorkspaceRecord[];
  rooms: WorkspaceRoomSummary[];
  codes: LoginCodeRecord[];
};

const authRoot = path.join(process.cwd(), ".filmia", "auth");
const authStatePath = path.join(authRoot, "state.json");

const emptyState = (): AuthState => ({
  users: [],
  workspaces: [],
  rooms: [],
  codes: [],
});

const hashCode = (code: string) =>
  createHash("sha256").update(code).digest("hex");

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

const ensureRoot = async () => {
  await mkdir(authRoot, { recursive: true });
};

const readState = async (): Promise<AuthState> => {
  await ensureRoot();

  try {
    const raw = await readFile(authStatePath, "utf8");
    return JSON.parse(raw) as AuthState;
  } catch {
    return emptyState();
  }
};

const writeState = async (state: AuthState) => {
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

export const getWorkspaceForUser = async (userId: string) => {
  const state = await readState();
  return state.workspaces.find((workspace) => workspace.userId === userId) ?? null;
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
