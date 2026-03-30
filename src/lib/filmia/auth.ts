import { cookies } from "next/headers";

import {
  addRoomToWorkspace,
  createWorkspaceForUser,
  getUserById,
  getWorkspaceForUser,
  listRoomsForWorkspace,
  updateWorkspaceRoomStatus,
  type FilmiaUser,
  type WorkspaceRecord,
  type WorkspaceRoomSummary,
} from "@/lib/filmia/auth-store";
import {
  sessionCookieName,
  verifySessionToken,
  type UserSession,
} from "@/lib/filmia/session";

export const getCurrentSession = async (): Promise<UserSession | null> => {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(sessionCookieName)?.value);
};

export const getCurrentUser = async (): Promise<FilmiaUser | null> => {
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
