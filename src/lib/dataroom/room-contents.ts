import { formatBytes } from "@/lib/dataroom/helpers";
import { vaultHasEncryptedDocument, type VaultRecord } from "@/lib/dataroom/types";

export type RoomFsNode = {
  id: string;
  kind: "folder" | "file";
  name: string;
  path: string;
  sizeBytes?: number;
  mimeType?: string;
  children?: RoomFsNode[];
};

/** Token rooms ship one encrypted bundle today; present it as a one-folder tree for clarity. */
export function buildRoomFileTree(metadata: VaultRecord): RoomFsNode {
  return {
    id: "room-root",
    kind: "folder",
    name: metadata.title.trim() || "Data room",
    path: "/",
    children: [
      {
        id: "primary-file",
        kind: "file",
        name: metadata.fileName,
        path: `/${metadata.fileName}`,
        sizeBytes: metadata.fileSize,
        mimeType: metadata.mimeType,
      },
    ],
  };
}

export function formatMimeLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/"))
    return `${mimeType.replace("image/", "").toUpperCase()} image`;
  if (mimeType.startsWith("text/")) return "Plain text";
  if (mimeType.includes("wordprocessingml")) return "Word";
  if (mimeType.includes("spreadsheetml")) return "Excel";
  if (mimeType.includes("presentationml")) return "PowerPoint";
  return mimeType.split("/").pop()?.toUpperCase() ?? mimeType;
}

export function summarizeRoomData(metadata: VaultRecord) {
  const hasDoc = vaultHasEncryptedDocument(metadata);
  const tree = buildRoomFileTree(metadata);
  const primary = tree.children?.[0];
  return {
    tree,
    fileCount: hasDoc ? (tree.children?.length ?? 0) : 0,
    totalBytes: hasDoc ? (primary?.sizeBytes ?? metadata.fileSize) : 0,
    totalSizeLabel: hasDoc ? formatBytes(metadata.fileSize) : "—",
    mimeLabel: hasDoc ? formatMimeLabel(metadata.mimeType) : "Not uploaded yet",
  };
}
