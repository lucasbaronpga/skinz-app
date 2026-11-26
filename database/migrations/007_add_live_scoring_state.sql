-- Block 5: Live Scoring auf dem Server.
-- Neuer Status 'paused'. Rückwärtskompatibel: Die bisherige App liest nur
-- Matches mit Status 'active' oder 'completed'.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_status_valid;

ALTER TABLE matches
  ADD CONSTRAINT matches_status_valid
  CHECK (status IN ('open', 'active', 'paused', 'completed', 'cancelled'));

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_completion_state_valid;

ALTER TABLE matches
  ADD CONSTRAINT matches_completion_state_valid CHECK (
    (status IN ('open', 'active', 'paused') AND completed_at IS NULL AND cancelled_at IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL AND completed_at IS NULL)
  );

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_paused_state_valid;

ALTER TABLE matches
  ADD CONSTRAINT matches_paused_state_valid
  CHECK ((status = 'paused') = (paused_at IS NOT NULL));

CREATE INDEX IF NOT EXISTS matches_paused_at_idx
  ON matches (paused_at)
  WHERE status = 'paused';
