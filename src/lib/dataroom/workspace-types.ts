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
