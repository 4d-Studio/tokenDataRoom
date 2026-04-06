import { cookies } from "next/headers";

import {
  addRoomToWorkspace,
  aggregateWorkspaceActivity,
  createWorkspaceForUser,
  deleteUserAccount,
  getUserById,
  getWorkspaceForUser,
  listRoomsForWorkspace,
  removeRoomFromWorkspace,
  updateWorkspaceRoomFile,
  updateWorkspaceRoomStatus,
  type TknUser,
  type WorkspaceRecord,
  type WorkspaceRoomSummary,
} from "@/lib/dataroom/auth-store";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { formatDateTime } from "@/lib/dataroom/helpers";
import {
  sessionCookieName,
  verifySessionToken,
  type UserSession,
} from "@/lib/dataroom/session";

export const getCurrentSession = async (): Promise<UserSession | null> => {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(sessionCookieName)?.value);
};

export const getCurrentUser = async (): Promise<TknUser | null> => {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return getUserById(session.userId);
};

export const getCurrentWorkspace = async (): Promise<WorkspaceRecord | null> => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return getWorkspaceForUser(user.id);
};

export const ensureWorkspaceForUser = async (
  userId: string,
  input: { name: string; companyName: string },
) => createWorkspaceForUser(userId, input);

export const getWorkspaceRooms = async (
  workspace?: WorkspaceRecord | null,
): Promise<WorkspaceRoomSummary[]> => {
  const ws = workspace ?? (await getCurrentWorkspace());

  if (!ws) {
    return [];
  }

  const rooms = await listRoomsForWorkspace(ws.id);
  const storage = getVaultStorage();
  return Promise.all(
    rooms.map(async (room) => {
      if (room.ownerKey) return room;
      const meta = await storage.getVaultMetadata(room.slug);
      if (meta?.ownerKey) {
        return { ...room, ownerKey: meta.ownerKey };
      }
      return room;
    }),
  );
};

export const recordWorkspaceRoom = async (
  workspaceId: string,
  room: Omit<WorkspaceRoomSummary, "workspaceId">,
) => addRoomToWorkspace(workspaceId, room);

export const syncWorkspaceRoomStatus = async (
  workspaceId: string,
  roomId: string,
  status: WorkspaceRoomSummary["status"],
) => updateWorkspaceRoomStatus(workspaceId, roomId, status);

export const syncWorkspaceRoomFileName = async (
  workspaceId: string,
  roomId: string,
  fileName: string,
) => updateWorkspaceRoomFile(workspaceId, roomId, { fileName });

export const deleteWorkspaceRoom = async (
  workspaceId: string,
  roomId: string,
) => removeRoomFromWorkspace(workspaceId, roomId);

export const deleteCurrentUser = async () => {
  const user = await getCurrentUser();
  if (!user) return false;
  return deleteUserAccount(user.id);
};

export const getWorkspaceActivity = async (workspace?: WorkspaceRecord | null) => {
  const ws = workspace ?? (await getCurrentWorkspace());
  if (!ws) return [];

  const rooms = await getWorkspaceRooms(ws);
  if (rooms.length === 0) return [];

  const storage = getVaultStorage();
  const events = await aggregateWorkspaceActivity(
    ws.id,
    (slug) => storage.getEvents(slug),
  );

  return events.map((event) => ({
    ...event,
    occurredAtFormatted: formatDateTime(event.occurredAt),
  }));
};
