-- Vanity slugs: custom, human-readable aliases for room share links.
-- e.g. /s/series-a-deck instead of /s/fm-d014ac1df5e6
--
-- Owners set a vanity slug from the room settings page.
-- The share page resolves vanity_slug → real_slug at request time.

CREATE TABLE IF NOT EXISTS public.tkn_vanity_slugs (
  vanity_slug TEXT        PRIMARY KEY,
  real_slug   TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tkn_vanity_slugs_real_slug_idx
  ON public.tkn_vanity_slugs (real_slug);

COMMENT ON TABLE public.tkn_vanity_slugs IS
  'Maps owner-chosen vanity slugs to system-generated fm-* room slugs';
