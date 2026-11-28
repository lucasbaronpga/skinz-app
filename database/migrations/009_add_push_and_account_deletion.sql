-- Block 8: Push-Abonnements und Konto löschen.
-- Rückwärtskompatibel: Die bisherige App kennt den Status 'deleted' nicht,
-- gelöschte Konten können sich dort ebenfalls nicht anmelden.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_subscriptions_endpoint_valid CHECK (
    endpoint LIKE 'https://%' AND CHAR_LENGTH(endpoint) <= 1000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_unique
  ON push_subscriptions (endpoint);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions (user_id);

-- Bisherige Status-Prüfung (pending, active, blocked) durch eine mit 'deleted' ersetzen.
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) ILIKE '%blocked%'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;
END
$$;

ALTER TABLE users
  ADD CONSTRAINT users_status_valid
  CHECK (status IN ('pending', 'active', 'blocked', 'deleted'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
