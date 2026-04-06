import { formatBytes } from "@/lib/dataroom/helpers";
import {
  type VaultRecord,
  vaultFilesList,
  vaultHasEncryptedDocument,
} from "@/lib/dataroom/types";

export type RoomFsNode = {
  id: string;
  kind: "folder" | "file";
  name: string;
  path: string;
  sizeBytes?: number;
  mimeType?: string;
  children?: RoomFsNode[];
};

/** Builds a flat folder tree from vaultFiles[]. Each file is a direct child of the room root. */
export function buildRoomFileTree(metadata: VaultRecord): RoomFsNode {
  const files = vaultFilesList(metadata);
  return {
    id: "room-root",
    kind: "folder",
    name: metadata.title.trim() || "Data room",
    path: "/",
    children: files.map((f) => ({
      id: f.id,
      kind: "file" as const,
      name: f.name,
      path: `/${f.name}`,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
    })),
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
  const files = vaultFilesList(metadata);
  const tree = buildRoomFileTree(metadata);
  const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
  const fileCount = files.length;
  const primaryMime = files[0]?.mimeType ?? "application/octet-stream";
  return {
    tree,
    fileCount,
    totalBytes,
    totalSizeLabel: hasDoc ? formatBytes(totalBytes) : "—",
    mimeLabel: hasDoc ? (fileCount === 1 ? formatMimeLabel(primaryMime) : `${fileCount} files`) : "Not uploaded yet",
  };
}
