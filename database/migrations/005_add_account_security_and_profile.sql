-- Block 2: Konto-Sicherheit und Profilgrundlagen.
-- Die Migration ist rückwärtskompatibel: Die bisherige App funktioniert unverändert weiter.
-- short_name wird erst bei der Umstellung auf die neue App auf NOT NULL gesetzt.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS paypal_link TEXT,
  ADD COLUMN IF NOT EXISTS profile_visibility JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Bestehende aktive und gesperrte Konten gelten als E-Mail-bestätigt.
UPDATE users
SET email_verified_at = COALESCE(approved_at, created_at)
WHERE status IN ('active', 'blocked')
  AND email_verified_at IS NULL;

-- Kürzel für bestehende Konten aus den Initialen erzeugen (bei Dopplungen mit Zahl).
WITH name_parts AS (
  SELECT
    id,
    created_at,
    REGEXP_REPLACE(SPLIT_PART(BTRIM(display_name), ' ', 1), '[^A-Za-z]', '', 'g') AS first_word,
    REGEXP_REPLACE(COALESCE((REGEXP_MATCH(BTRIM(display_name), '(\S+)$'))[1], ''), '[^A-Za-z]', '', 'g') AS last_word
  FROM users
  WHERE short_name IS NULL
),
base_codes AS (
  SELECT
    id,
    created_at,
    RPAD(
      UPPER(
        CASE
          WHEN last_word = '' OR last_word = first_word THEN LEFT(first_word, 2)
          WHEN first_word = '' THEN LEFT(last_word, 2)
          ELSE LEFT(first_word, 1) || LEFT(last_word, 1)
        END
      ),
      2,
      'X'
    ) AS base_code
  FROM name_parts
),
ranked AS (
  SELECT
    id,
    base_code,
    ROW_NUMBER() OVER (PARTITION BY base_code ORDER BY created_at, id) AS rank_number
  FROM base_codes
)
UPDATE users
SET short_name = CASE
  WHEN ranked.rank_number = 1 THEN ranked.base_code
  ELSE ranked.base_code || ranked.rank_number::TEXT
END
FROM ranked
WHERE users.id = ranked.id;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_short_name_valid;

ALTER TABLE users
  ADD CONSTRAINT users_short_name_valid
  CHECK (short_name IS NULL OR short_name ~ '^[A-Z0-9]{2,4}$');

CREATE UNIQUE INDEX IF NOT EXISTS users_short_name_unique
  ON users (short_name);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_paypal_link_valid;

ALTER TABLE users
  ADD CONSTRAINT users_paypal_link_valid
  CHECK (paypal_link IS NULL OR CHAR_LENGTH(paypal_link) <= 200);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_profile_visibility_object;

ALTER TABLE users
  ADD CONSTRAINT users_profile_visibility_object
  CHECK (jsonb_typeof(profile_visibility) = 'object');

-- Einmal-Tokens für E-Mail-Bestätigung und Passwort-Reset (nur als Hash gespeichert).
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_tokens_purpose_valid CHECK (purpose IN ('email_verification', 'password_reset')),
  CONSTRAINT auth_tokens_token_hash_not_blank CHECK (BTRIM(token_hash) <> ''),
  CONSTRAINT auth_tokens_expiry_valid CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_token_hash_unique
  ON auth_tokens (token_hash);

CREATE INDEX IF NOT EXISTS auth_tokens_open_user_purpose_idx
  ON auth_tokens (user_id, purpose)
  WHERE used_at IS NULL;

-- Ereignisse für die Begrenzung von Anmelde-, Registrierungs- und Reset-Versuchen.
CREATE TABLE IF NOT EXISTS auth_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind TEXT NOT NULL,
  identifier_hash TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_events_kind_valid CHECK (
    kind IN ('login_failed', 'registration', 'verification_request', 'password_reset_request')
  )
);

CREATE INDEX IF NOT EXISTS auth_events_kind_ip_created_idx
  ON auth_events (kind, ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_events_kind_identifier_created_idx
  ON auth_events (kind, identifier_hash, created_at DESC);
