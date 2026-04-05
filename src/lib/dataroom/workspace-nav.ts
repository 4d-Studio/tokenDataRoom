import type { WorkspaceRoomSummary } from "@/lib/dataroom/workspace-types";

/** Owner manage URL for sidebar + room list. Falls back to workspace if key is missing. */
export function roomManageHref(room: WorkspaceRoomSummary) {
  if (room.ownerKey) {
    return `/m/${room.slug}?key=${encodeURIComponent(room.ownerKey)}`;
  }
  return "/workspace";
}

export function roomNavItemsFromRooms(rooms: WorkspaceRoomSummary[]) {
  return rooms.map((r) => ({
    slug: r.slug,
    title: r.title,
    manageHref: roomManageHref(r),
  }));
}
