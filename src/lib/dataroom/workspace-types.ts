export type WorkspaceRoomSummary = {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  fileName: string;
  /** Number of files in the room. Backfilled from vault metadata when missing. */
  fileCount?: number;
  senderName: string;
  createdAt: string;
  status: "active" | "revoked";
  /** Present for manage links; backfilled from vault metadata when missing in workspace index. */
  ownerKey?: string;
};
