-- Block 4: offene Flights, Einladungen und serverseitige Match-IDs.
-- Rückwärtskompatibel: Die bisherige App liest nur Matches mit Status 'active'
-- oder 'completed' und legt Spieler ohne Einladungsstatus an (Standard 'accepted').

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_status_valid;

ALTER TABLE matches
  ADD CONSTRAINT matches_status_valid
  CHECK (status IN ('open', 'active', 'completed', 'cancelled'));

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_completion_state_valid;

ALTER TABLE matches
  ADD CONSTRAINT matches_completion_state_valid CHECK (
    (status IN ('open', 'active') AND completed_at IS NULL AND cancelled_at IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL AND completed_at IS NULL)
  );

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS invite_token TEXT;

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_invite_token_only_open;

ALTER TABLE matches
  ADD CONSTRAINT matches_invite_token_only_open
  CHECK (invite_token IS NULL OR status = 'open');

CREATE UNIQUE INDEX IF NOT EXISTS matches_invite_token_unique
  ON matches (invite_token)
  WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS matches_open_created_by_idx
  ON matches (created_by_user_id, created_at DESC)
  WHERE status = 'open';

ALTER TABLE match_players
  ADD COLUMN IF NOT EXISTS invitation_status TEXT NOT NULL DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

ALTER TABLE match_players
  DROP CONSTRAINT IF EXISTS match_players_invitation_status_valid;

ALTER TABLE match_players
  ADD CONSTRAINT match_players_invitation_status_valid
  CHECK (invitation_status IN ('invited', 'accepted', 'declined'));

CREATE INDEX IF NOT EXISTS match_players_user_invitation_idx
  ON match_players (user_id, invitation_status);

-- Fortlaufende Skinz-IDs (SKZ-0001 …) vergibt ab jetzt der Server.
CREATE SEQUENCE IF NOT EXISTS match_code_seq;

SELECT setval(
  'match_code_seq',
  COALESCE(
    (
      SELECT MAX((SUBSTRING(match_code FROM '^SKZ-([0-9]+)$'))::BIGINT)
      FROM matches
      WHERE match_code ~ '^SKZ-[0-9]+$'
    ),
    0
  ) + 1,
  false
);
