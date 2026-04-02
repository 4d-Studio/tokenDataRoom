import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BreadcrumbItemShape = {
  href?: string;
  label: string;
};

export const productFieldClass =
  "h-11 rounded-xl border-border bg-white text-[0.95rem] text-foreground shadow-none placeholder:text-[#5c5c5c]";

export const productTextareaClass =
  "rounded-xl border-border bg-white text-[0.95rem] text-foreground shadow-none placeholder:text-[#5c5c5c]";

export function ProductPageIntro({
  eyebrow,
  title,
  description,
  action,
  aside,
  className,
  titleClassName,
  descriptionClassName,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  aside?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <section className={cn("flex flex-wrap items-end justify-between gap-3 pb-4", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1
          className={cn(
            eyebrow ? "mt-2.5" : "",
            "text-[1.35rem] font-bold tracking-[-0.04em] text-foreground sm:text-[1.625rem]",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {description ? (
          <div
            className={cn(
              "tkn-support mt-2 max-w-2xl",
              descriptionClassName,
            )}
          >
            {description}
          </div>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}

export function ProductBreadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItemShape[];
  className?: string;
}) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <div key={`${item.label}-${index}`} className="contents">
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function ProductSectionCard({
  className,
  size = "default",
  ...props
}: ComponentProps<typeof Card>) {
  return <Card size={size} className={cn("py-0 shadow-none", className)} {...props} />;
}

export function ProductSectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <CardHeader className={cn("border-b px-4 py-4", className)}>
      <div className="min-w-0 space-y-0">
        <CardTitle>{title}</CardTitle>
        {description ? (
          <CardDescription className="max-w-2xl">{description}</CardDescription>
        ) : null}
      </div>
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
  );
}

export function ProductSectionBody({
  className,
  ...props
}: ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("px-4 py-4", className)} {...props} />;
}

export function ProductMetaBlock({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("viewer-shell p-4", className)}>
      <div className="label-title">{label}</div>
      <div className="mt-2 text-[0.9375rem] font-medium leading-snug text-foreground">
        {children}
      </div>
    </div>
  );
}

export function ProductMetric({
  icon,
  value,
  label,
  subtext,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: ReactNode;
  subtext?: ReactNode;
}) {
  return (
    <div className="viewer-shell p-4">
      <div className="text-[var(--color-accent)]">{icon}</div>
      <div className="mt-3 text-[1.6rem] font-bold leading-none tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1.5 text-[0.8125rem] font-medium text-[var(--tkn-text-support)]">
        {label}
      </div>
      {subtext ? (
        <div className="tkn-fine mt-1 max-w-[14rem]">{subtext}</div>
      ) : null}
    </div>
  );
}

export function ProductListRow({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("list-row", className)} {...props} />;
}

export function ProductAuthFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-[30rem] flex-1 flex-col justify-center gap-4 py-6 sm:py-10",
        className,
      )}
    >
      {children}
    </section>
  );
}
