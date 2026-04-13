import { cn } from "@/lib/utils";

/** Product wordmark — text only (workspace logos live in share header / settings, not here). */
export const BrandMark = () => (
  <div>
    <div className="text-base font-bold tracking-[-0.02em] text-foreground">Token.FYI</div>
    <div className="tkn-fine leading-snug">Deal rooms for outsiders</div>
  </div>
);

/** Recipient share pages — slim nav attribution (cream canvas, ink type; accent stays on CTAs). */
export const PoweredByToken = ({ className }: { className?: string }) => (
  <p
    className={cn(
      "text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground",
      className,
    )}
  >
    <span className="font-normal opacity-[0.92]">Powered by</span>{" "}
    <span className="font-bold tracking-[0.08em] text-foreground">Token.FYI</span>
  </p>
);
