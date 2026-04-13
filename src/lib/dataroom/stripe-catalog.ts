/**
 * Stripe catalog for Token **Plus** paid tier.
 *
 * In the app you also have Free + Unicorn plans; only Plus is a Stripe product today.
 * Override any ID via env for staging or dashboard changes.
 *
 * Product: prod_UHzVCCUbHJcvP7
 * Monthly ($9.99/mo): price_1TJPWaCmmVxqlqXcCdlvqScb
 * Annual ($96/yr): price_1TJPXkCmmVxqlqXcMlj3n6uQ
 *
 * ---
 * To ship Stripe upgrades end-to-end (not wired in this repo yet):
 * 1. `pnpm add stripe` and set STRIPE_SECRET_KEY (+ publishable key for client if using Elements).
 * 2. Add POST /api/billing/checkout-session: create Checkout Session with price IDs below; success_url → /workspace/settings?billing=success.
 * 3. Add POST /api/billing/webhook: verify STRIPE_WEBHOOK_SECRET, handle checkout.session.completed + customer.subscription.updated/deleted → updateUserPlan().
 * 4. Pro (unicorn): add Stripe Product/Prices and map webhook price id → plan slug (or use metadata.plan on the subscription).
 * 5. Optional: Customer Portal for self-serve plan changes / cancel.
 */
const productPlusFromEnv =
  process.env.STRIPE_PRODUCT_PLUS_ID?.trim() ??
  process.env.NEXT_PUBLIC_STRIPE_PRODUCT_PLUS?.trim();

export const STRIPE_PRODUCT_PLUS_ID = productPlusFromEnv || "prod_UHzVCCUbHJcvP7";

const monthlyFromEnv = process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY?.trim();
const annualFromEnv = process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_ANNUAL?.trim();

/** Plus — $9.99/month (recurring monthly). */
export const STRIPE_PRICE_PLUS_MONTHLY =
  monthlyFromEnv || "price_1TJPWaCmmVxqlqXcCdlvqScb";

/** Plus — $96/year (recurring yearly). */
export const STRIPE_PRICE_PLUS_ANNUAL =
  annualFromEnv || "price_1TJPXkCmmVxqlqXcMlj3n6uQ";
