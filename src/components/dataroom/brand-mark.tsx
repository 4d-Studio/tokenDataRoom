interface BrandMarkProps {
  logoUrl?: string;
}

export const BrandMark = ({ logoUrl }: BrandMarkProps = {}) => (
  <div className="flex items-center gap-2.5">
    {logoUrl ? (
      <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg border border-[var(--odr-panel-border)] bg-white p-1">
        <img src={logoUrl} alt="Workspace logo" className="max-h-full max-w-full object-contain" />
      </div>
    ) : (
      <div className="flex size-9 items-center justify-center rounded-lg border border-[var(--odr-panel-border)] bg-white">
        <div className="size-3 rounded-[5px] bg-[var(--color-accent)]" />
      </div>
    )}
    <div>
      <div className="text-base font-bold tracking-[-0.02em] text-foreground">OpenDataRoom</div>
      <div className="odr-fine leading-snug">Private document rooms</div>
    </div>
  </div>
);
