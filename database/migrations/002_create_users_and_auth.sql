CREATE TABLE IF NOT EXISTS golf_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'Deutschland',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT golf_clubs_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT golf_clubs_country_not_blank CHECK (BTRIM(country) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS golf_clubs_name_location_unique
  ON golf_clubs (LOWER(BTRIM(name)), LOWER(BTRIM(COALESCE(location, ''))));

CREATE INDEX IF NOT EXISTS golf_clubs_active_name_idx
  ON golf_clubs (is_active, name);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending',
  handicap_index NUMERIC(4,1),
  home_club_id UUID REFERENCES golf_clubs(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  blocked_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_not_blank CHECK (BTRIM(email) <> ''),
  CONSTRAINT users_email_normalized CHECK (email = LOWER(BTRIM(email))),
  CONSTRAINT users_password_hash_not_blank CHECK (BTRIM(password_hash) <> ''),
  CONSTRAINT users_display_name_not_blank CHECK (BTRIM(display_name) <> ''),
  CONSTRAINT users_role_valid CHECK (role IN ('admin', 'user')),
  CONSTRAINT users_status_valid CHECK (status IN ('pending', 'active', 'blocked')),
  CONSTRAINT users_handicap_index_valid CHECK (
    handicap_index IS NULL OR handicap_index BETWEEN -10.0 AND 54.0
  ),
  CONSTRAINT users_approval_state_valid CHECK (
    (approved_at IS NULL AND approved_by IS NULL)
    OR (approved_at IS NOT NULL AND approved_by IS NOT NULL)
  ),
  CONSTRAINT users_blocked_state_valid CHECK (
    status = 'blocked' OR blocked_at IS NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users (LOWER(BTRIM(email)));

CREATE INDEX IF NOT EXISTS users_status_created_at_idx
  ON users (status, created_at);

CREATE INDEX IF NOT EXISTS users_home_club_id_idx
  ON users (home_club_id);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_approved_by_fkey;

ALTER TABLE users
  ADD CONSTRAINT users_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_sessions_token_hash_not_blank CHECK (BTRIM(token_hash) <> ''),
  CONSTRAINT user_sessions_expiry_valid CHECK (expires_at > created_at),
  CONSTRAINT user_sessions_revoked_at_valid CHECK (
    revoked_at IS NULL OR revoked_at >= created_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_hash_unique
  ON user_sessions (token_hash);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
  ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx
  ON user_sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  previous_data JSONB,
  new_data JSONB,
  reason TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_audit_logs_action_not_blank CHECK (BTRIM(action) <> ''),
  CONSTRAINT admin_audit_logs_target_type_not_blank CHECK (BTRIM(target_type) <> '')
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_user_id_idx
  ON admin_audit_logs (admin_user_id);

CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx
  ON admin_audit_logs (target_type, target_id);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx
  ON admin_audit_logs (created_at DESC);
