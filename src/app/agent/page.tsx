import type { Metadata } from "next";

import { BrandMark } from "@/components/dataroom/brand-mark";

export const metadata: Metadata = {
  title: "Route map",
  description: "Development reference: Token app routes and API surface.",
  robots: { index: false, follow: false },
};
import {
  ProductBreadcrumb,
  ProductPageIntro,
  ProductListRow,
  ProductSectionCard,
  ProductSectionBody,
  ProductSectionHeader,
} from "@/components/dataroom/product-ui";

const routes = [
  ["/", "Minimal get-started landing page"],
  ["/login", "Magic-code login"],
  ["/onboarding", "Workspace creation"],
  ["/workspace", "User workspace"],
  ["/new", "Create a Token room"],
  ["/s/[slug]", "Recipient access page"],
  ["/m/[slug]?key=...", "Owner controls and activity"],
];

const apiRoutes = [
  ["POST /api/auth/request-code", "Request magic code"],
  ["POST /api/auth/verify-code", "Verify code and create session cookie"],
  ["POST /api/workspaces", "Create workspace for the logged-in user"],
  ["POST /api/vaults", "Create room and store encrypted payload"],
  ["POST /api/vaults/[slug]/access", "Record per-room NDA acceptance and issue access cookie"],
  [
    "POST /api/vaults/[slug]/workspace-nda",
    "Workspace-wide NDA + vault cookie + workspace cookie (rooms with workspaceId)",
  ],
  [
    "POST /api/vaults/[slug]/bootstrap-workspace-access",
    "Mint vault access cookie from existing workspace NDA cookie (other rooms)",
  ],
  ["GET /api/vaults/[slug]/bundle", "Return encrypted bundle after access checks"],
];

export default function AgentPage() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <BrandMark />
        <ProductBreadcrumb
          items={[
            { href: "/", label: "Home" },
            { href: "/workspace", label: "Workspace" },
            { label: "Agent docs" },
          ]}
        />
      </header>

      <ProductPageIntro
        eyebrow="Agent workspace"
        title="Token system overview"
        description="This route is for incoming agents. It summarizes the product flow, API surface, and the repo docs that matter before making changes."
        className="page-hero"
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <ProductSectionCard className="tkn-elevated-panel rounded-2xl border border-[var(--tkn-panel-border)] ring-0">
          <ProductSectionHeader title="Routes" />
          <ProductSectionBody className="pt-0">
            {routes.map(([path, description]) => (
              <ProductListRow key={path}>
                <div className="text-sm font-semibold text-[var(--color-ink)]">{path}</div>
                <div className="mt-1 text-sm text-muted-foreground">{description}</div>
              </ProductListRow>
            ))}
          </ProductSectionBody>
        </ProductSectionCard>

        <ProductSectionCard className="tkn-elevated-panel rounded-2xl border border-[var(--tkn-panel-border)] ring-0">
          <ProductSectionHeader title="API surface" />
          <ProductSectionBody className="pt-0">
            {apiRoutes.map(([path, description]) => (
              <ProductListRow key={path}>
                <div className="text-sm font-semibold text-[var(--color-ink)]">{path}</div>
                <div className="mt-1 text-sm text-muted-foreground">{description}</div>
              </ProductListRow>
            ))}
          </ProductSectionBody>
        </ProductSectionCard>
      </section>
    </main>
  );
}
