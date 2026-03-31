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
  updateWorkspaceRoomStatus,
  type OdrUser,
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

export const getCurrentUser = async (): Promise<OdrUser | null> => {
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

export const getWorkspaceRooms = async (): Promise<WorkspaceRoomSummary[]> => {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return [];
  }

  return listRoomsForWorkspace(workspace.id);
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

export const deleteWorkspaceRoom = async (
  workspaceId: string,
  roomId: string,
) => removeRoomFromWorkspace(workspaceId, roomId);

export const deleteCurrentUser = async () => {
  const user = await getCurrentUser();
  if (!user) return false;
  return deleteUserAccount(user.id);
};

export const getWorkspaceActivity = async () => {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return [];

  const rooms = await getWorkspaceRooms();
  if (rooms.length === 0) return [];

  const storage = getVaultStorage();
  const events = await aggregateWorkspaceActivity(
    workspace.id,
    (slug) => storage.getEvents(slug),
  );

  return events.map((event) => ({
    ...event,
    occurredAtFormatted: formatDateTime(event.occurredAt),
  }));
};
