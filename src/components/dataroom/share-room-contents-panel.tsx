"use client";

import { CheckCircle2, FileText, Folder, Lock } from "lucide-react";

import { formatMimeLabel, summarizeRoomData } from "@/lib/dataroom/room-contents";
import { vaultHasEncryptedDocument, type VaultRecord } from "@/lib/dataroom/types";
import { formatBytes, formatDateTime } from "@/lib/dataroom/helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ShareRoomContentsPanelProps = {
  metadata: VaultRecord;
  isDecrypted: boolean;
  accessRequirementSummary: string;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-4">
      <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function ShareRoomContentsPanel({
  metadata,
  isDecrypted,
  accessRequirementSummary,
}: ShareRoomContentsPanelProps) {
  const { fileCount, totalSizeLabel, mimeLabel } = summarizeRoomData(metadata);
  const hasDoc = vaultHasEncryptedDocument(metadata);
  const primary = hasDoc ? metadata.fileName : "No document yet";

  return (
    <Card id="room-contents" className="scroll-mt-24">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Files in this room</CardTitle>
            <CardDescription>
              {hasDoc
                ? "One encrypted package. Unlock it in the preview column to decrypt locally."
                : "The sender has not uploaded a file yet. The room and NDA are ready; check back after they add the document."}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {fileCount === 0 ? "0 files" : fileCount === 1 ? "1 file" : `${fileCount} files`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {/* Primary: package + single file — no duplicate “room title” block above folder */}
        <div
          className="rounded-lg border bg-muted/40 p-4"
          role="region"
          aria-label="Shared files"
        >
          <div className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
              <Folder className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="truncate text-sm font-medium text-foreground" title={metadata.title}>
                  {metadata.title}
                </p>
                <p className="text-xs text-muted-foreground">Room package</p>
              </div>

              <div className="border-l-2 border-border pl-3">
                <div className="flex gap-2">
                  <FileText
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          isDecrypted ? "text-foreground" : "text-muted-foreground",
                        )}
                        title={primary}
                      >
                        {primary}
                      </span>
                      {isDecrypted ? (
                        <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
                          <CheckCircle2 className="size-3" aria-hidden />
                          Unlocked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 gap-1 font-normal">
                          <Lock className="size-3" aria-hidden />
                          Encrypted
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {totalSizeLabel} · {mimeLabel}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <details className="group rounded-lg border bg-card">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground outline-none ring-offset-2 [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex items-center justify-between gap-2">
              Room details
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                Show
              </span>
              <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">
                Hide
              </span>
            </span>
          </summary>
          <Separator />
          <div className="px-4 py-4">
            <dl className="space-y-4">
              <DetailRow label="Type" value={mimeLabel} />
              <DetailRow label="Size" value={totalSizeLabel} />
              <DetailRow label="Expires" value={formatDateTime(metadata.expiresAt)} />
              <DetailRow label="Access" value={accessRequirementSummary} />
              <DetailRow
                label="Status"
                value={metadata.status === "active" ? "Active" : "Inactive"}
              />
            </dl>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
