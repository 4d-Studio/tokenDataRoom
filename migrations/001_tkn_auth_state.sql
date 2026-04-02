-- Auth / workspace index: one row (id = 1) holding JSON snapshot.
-- Run via `pnpm db:migrate` or Railway release phase.

CREATE TABLE IF NOT EXISTS public.tkn_auth_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  state JSONB NOT NULL DEFAULT '{"users":[],"workspaces":[],"rooms":[],"codes":[],"workspaceGuestAcceptances":[]}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tkn_auth_state IS 'Token auth-store snapshot (users, workspaces, room index, OTP codes, NDA acceptances)';
