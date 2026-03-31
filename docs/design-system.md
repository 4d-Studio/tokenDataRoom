# OpenDataRoom Design System

OpenDataRoom uses a thin product layer on top of shadcn primitives. The goal is a calm, procedural interface for secure sharing rather than dashboard theatrics.

## Core principles

- Light-first UI with low-contrast chrome
- Compact spacing and restrained radius
- One primary action per surface
- Short labels and procedural copy
- shadcn primitives first, custom CSS second

## Tokens

- Background: warm off-white
- Surface: white cards with thin borders
- Accent: orange for primary actions and secure-state cues
- Typography: Manrope for the full product UI

## Shared product primitives

- `ProductAuthFrame`
  Centered narrow auth/onboarding frame
- `ProductPageIntro`
  Standard title, description, eyebrow, and action composition
- `ProductBreadcrumb`
  Consistent route context above or alongside page content
- `ProductSectionCard`
  Base section surface built on `Card`
- `ProductSectionHeader`
  Standard section title/description/action header
- `ProductSectionBody`
  Standard section body padding
- `ProductMetaBlock`
  Compact metadata/value block
- `ProductMetric`
  Compact numeric summary tile
- `ProductListRow`
  Standard row rhythm for reviewer logs and event timelines
- `productFieldClass`
  Standard input treatment
- `productTextareaClass`
  Standard textarea treatment

## Page anatomy

- Public pages: `page-shell` -> `page-header` -> `page-hero`
- Auth pages: `page-shell` -> `ProductAuthFrame`
- Authenticated product pages: `AuthenticatedShell` -> `ProductPageIntro` -> `ProductSectionCard`
- Review and owner pages: `BrandMark` + `ProductBreadcrumb` -> stacked `ProductSectionCard`

## Avoid

- Oversized radii
- Multiple competing hero treatments
- Freehand page wrappers when a product primitive already exists
- Mixing `surface-panel` and raw card composition on the same page without reason
