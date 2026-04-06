-- Recipients: persistent email identity so NDA signers can access rooms later
-- without re-signing the NDA each visit.
--
-- Flow:
--   1. Recipient signs NDA (first visit) → they can optionally "remember me"
--   2. If they opt in, we create a RecipientAccount + send them an OTP
--   3. On return visit, they enter their email → OTP → access cookie issued
--   4. Their email is now logged with viewed/downloaded events

CREATE TABLE IF NOT EXISTS public.tkn_recipient_accounts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,           -- NULL until they verify their email
  last_login  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tkn_recipient_accounts_email_idx
  ON public.tkn_recipient_accounts (email);

-- OTP codes for recipient magic-link login (separate namespace from owner OTP)
CREATE TABLE IF NOT EXISTS public.tkn_recipient_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  code_hash   TEXT        NOT NULL,  -- SHA-256 of the 6-digit code
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at     TIMESTAMPTZ,           -- NULL until code is used
  slug        TEXT        NOT NULL   -- room they were trying to access
);

CREATE INDEX IF NOT EXISTS tkn_recipient_codes_email_idx
  ON public.tkn_recipient_codes (email, expires_at DESC);

COMMENT ON TABLE public.tkn_recipient_accounts IS
  'Persistent recipient identity — created when an NDA signer opts in to "remember me"';
COMMENT ON TABLE public.tkn_recipient_codes IS
  'Short-lived OTP codes for recipient magic-link authentication';
