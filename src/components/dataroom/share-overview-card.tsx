import type { VaultRecord } from "@/lib/dataroom/types";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type ShareOverviewCardProps = {
  metadata: VaultRecord;
};

export function ShareOverviewCard({ metadata }: ShareOverviewCardProps) {
  const navigationItems = (
    [
      { href: "#room-contents", label: "Contents" },
      metadata.requiresNda ? { href: "#nda", label: "NDA" } : null,
      { href: "#access", label: "Access" },
      { href: "#preview", label: "Preview" },
    ].filter(Boolean) as Array<{ href: string; label: string }>
  );

  return (
    <Card className="gap-0 scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
            Data room
          </Badge>
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.85rem]">
            {metadata.title}
          </span>
        </CardTitle>
        <CardDescription className="max-w-2xl">
          Shared by {metadata.senderName}
          {metadata.senderCompany ? ` · ${metadata.senderCompany}` : ""}. Use the left column for
          room contents and agreements; unlock and preview on the right.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {metadata.status === "active" ? "Active" : "Inactive"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          {navigationItems.map((item) => (
            <Button key={item.href} asChild variant="outline" size="sm">
              <a href={item.href}>{item.label}</a>
            </Button>
          ))}
        </div>

        {metadata.message ? (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-foreground">
            <p className="text-xs font-medium text-muted-foreground">Admin note</p>
            <p className="mt-1.5 leading-relaxed">{metadata.message}</p>
          </div>
        ) : null}

        <Separator />

        <p className="text-xs leading-normal text-muted-foreground">
          OpenDataRoom records room opens, NDA acceptance, and downloads for the sender.
        </p>
      </CardContent>
    </Card>
  );
}
