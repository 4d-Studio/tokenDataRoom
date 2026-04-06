"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, MoreHorizontal, Settings2, Trash2 } from "lucide-react";

import type { WorkspaceRoomSummary } from "@/lib/dataroom/workspace-types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
            className="flex items-center justify-between gap-4 border-t border-border py-4 first:border-t-0"
          >
            {/* Left: icon + title + meta */}
            <div className="min-w-0 flex items-center gap-3 flex-1">
              <FileText className="size-5 shrink-0 text-[var(--tkn-text-fine)]" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-semibold text-foreground truncate">{room.title}</p>
                <p className="tkn-fine mt-0.5 truncate">
                  {room.fileName ? `${room.fileName} · ` : ""}{room.createdAtFormatted}
                </p>
              </div>
            </div>

            {/* Right: status + primary action + overflow */}
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold capitalize ${
                  isActive
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {room.status}
              </span>

              <Button asChild size="sm" className="gap-1.5">
                <Link href={room.manageHref}>
                  <Settings2 className="size-3.5" />
                  Manage
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <CopyButton value={shareUrl} size="icon" className="size-8 w-full justify-start gap-2" ariaLabel="Copy link" />
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/s/${room.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="size-3.5" />
                      Preview
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    destructive
                    disabled={isPending}
                    onSelect={() => handleDelete(room.slug)}
                    className="gap-2"
                  >
                    <Trash2 className="size-3.5" />
                    {isConfirming ? "Tap again to confirm" : "Delete room"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
