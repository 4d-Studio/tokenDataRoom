"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Settings2, Trash2 } from "lucide-react";

import type { WorkspaceRoomSummary } from "@/lib/dataroom/workspace-types";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/dataroom/copy-button";

export type WorkspaceRoomRow = WorkspaceRoomSummary & {
  createdAtFormatted: string;
  manageHref: string;
};

interface RoomsListProps {
  rooms: WorkspaceRoomRow[];
  baseUrl: string;
}

export function RoomsList({ rooms, baseUrl }: RoomsListProps) {
  const router = useRouter();
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (slug: string) => {
    if (deletingSlug === slug) {
      startTransition(() => {
        void (async () => {
          const res = await fetch(`/api/workspace/rooms/${slug}`, { method: "DELETE" });
          if (res.ok) {
            setDeletingSlug(null);
            router.refresh();
          }
        })();
      });
    } else {
      setDeletingSlug(slug);
    }
  };

  return (
    <div className="flex flex-col">
      {rooms.map((room) => {
        const shareUrl = `${baseUrl}/s/${room.slug}`;
        const isActive = room.status === "active";
        const isConfirming = deletingSlug === room.slug;

        return (
          <div
            key={room.id}
            className="group flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0 transition-colors hover:bg-muted/30"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-[var(--tkn-text-fine)]" />
                <span className="text-[0.95rem] font-bold text-foreground">
                  {room.title}
                </span>
              </div>
              <p className="tkn-support mt-1 pl-6">
                {room.fileName} · Created {room.createdAtFormatted}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold capitalize ${
                  isActive
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {room.status}
              </span>

              <div
                className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                title="Copy recipient link"
              >
                <CopyButton value={shareUrl} size="icon" />
              </div>

              <Button asChild size="sm" className="gap-1">
                <Link href={room.manageHref}>
                  <Settings2 className="h-3.5 w-3.5" />
                  Manage
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm" className="gap-1">
                <Link href={`/s/${room.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview
                </Link>
              </Button>

              <Button
                variant={isConfirming ? "destructive" : "outline"}
                size="sm"
                disabled={isPending}
                onClick={() => handleDelete(room.slug)}
                onBlur={() => {
                  if (isConfirming) setTimeout(() => setDeletingSlug(null), 200);
                }}
                title={isConfirming ? "Click again to confirm" : "Delete room"}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isConfirming ? "Confirm" : null}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
