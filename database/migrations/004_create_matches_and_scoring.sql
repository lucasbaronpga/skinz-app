CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_code TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  golf_course_id UUID NOT NULL REFERENCES golf_courses(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active',
  game_mode TEXT NOT NULL,
  stake_amount NUMERIC(10,2) NOT NULL,
  hole_count SMALLINT NOT NULL,
  current_hole SMALLINT NOT NULL DEFAULT 1,
  skinz_carryover INTEGER NOT NULL DEFAULT 0,
  oozle_carryover INTEGER NOT NULL DEFAULT 0,
  special_scoring_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  oozle_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  oozle_value NUMERIC(10,2),
  oozle_foozle_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  oozle_carryover_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  course_snapshot JSONB NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_match_code_not_blank CHECK (BTRIM(match_code) <> ''),
  CONSTRAINT matches_status_valid CHECK (status IN ('active', 'completed', 'cancelled')),
  CONSTRAINT matches_game_mode_valid CHECK (game_mode IN ('classic', 'professional', 'wolffn')),
  CONSTRAINT matches_stake_amount_valid CHECK (stake_amount > 0),
  CONSTRAINT matches_hole_count_valid CHECK (hole_count IN (9, 18)),
  CONSTRAINT matches_current_hole_valid CHECK (current_hole BETWEEN 1 AND hole_count),
  CONSTRAINT matches_skinz_carryover_valid CHECK (skinz_carryover >= 0),
  CONSTRAINT matches_oozle_carryover_valid CHECK (oozle_carryover >= 0),
  CONSTRAINT matches_oozle_value_valid CHECK (
    (oozle_enabled = FALSE AND oozle_value IS NULL)
    OR (oozle_enabled = TRUE AND oozle_value IS NOT NULL AND oozle_value > 0)
  ),
  CONSTRAINT matches_wolffn_oozle_excluded CHECK (
    game_mode <> 'wolffn' OR oozle_enabled = FALSE
  ),
  CONSTRAINT matches_completion_state_valid CHECK (
    (status = 'active' AND completed_at IS NULL AND cancelled_at IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL AND completed_at IS NULL)
  ),
  CONSTRAINT matches_state_version_valid CHECK (state_version >= 1),
  CONSTRAINT matches_course_snapshot_object CHECK (jsonb_typeof(course_snapshot) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS matches_match_code_unique
  ON matches (LOWER(BTRIM(match_code)));

CREATE INDEX IF NOT EXISTS matches_created_by_status_updated_idx
  ON matches (created_by_user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS matches_course_started_idx
  ON matches (golf_course_id, started_at DESC);

CREATE INDEX IF NOT EXISTS matches_status_completed_idx
  ON matches (status, completed_at DESC)
  WHERE status = 'completed';

CREATE TABLE IF NOT EXISTS match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  display_order SMALLINT NOT NULL,
  display_name_snapshot TEXT NOT NULL,
  handicap_index_snapshot NUMERIC(4,1),
  home_club_id_snapshot UUID REFERENCES golf_clubs(id) ON DELETE SET NULL,
  home_club_name_snapshot TEXT,
  total_strokes INTEGER NOT NULL DEFAULT 0,
  total_to_par INTEGER NOT NULL DEFAULT 0,
  skinz_won INTEGER NOT NULL DEFAULT 0,
  skinz_winnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  oozle_winnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_winnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT match_players_display_order_valid CHECK (display_order >= 1),
  CONSTRAINT match_players_display_name_not_blank CHECK (BTRIM(display_name_snapshot) <> ''),
  CONSTRAINT match_players_handicap_valid CHECK (
    handicap_index_snapshot IS NULL OR handicap_index_snapshot BETWEEN -10.0 AND 54.0
  ),
  CONSTRAINT match_players_total_strokes_valid CHECK (total_strokes >= 0),
  CONSTRAINT match_players_skinz_won_valid CHECK (skinz_won >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS match_players_match_user_unique
  ON match_players (match_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS match_players_match_order_unique
  ON match_players (match_id, display_order);

CREATE INDEX IF NOT EXISTS match_players_user_match_idx
  ON match_players (user_id, match_id);

CREATE TABLE IF NOT EXISTS match_holes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  hole_number SMALLINT NOT NULL,
  par SMALLINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  winner_label TEXT,
  winning_score SMALLINT,
  has_tie BOOLEAN NOT NULL DEFAULT FALSE,
  skinz_awarded INTEGER NOT NULL DEFAULT 0,
  carryover_before INTEGER NOT NULL DEFAULT 0,
  carryover_after INTEGER NOT NULL DEFAULT 0,
  pot_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  special_scoring_label TEXT,
  game_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT match_holes_number_valid CHECK (hole_number BETWEEN 1 AND 18),
  CONSTRAINT match_holes_par_valid CHECK (par BETWEEN 3 AND 6),
  CONSTRAINT match_holes_status_valid CHECK (status IN ('completed', 'superseded')),
  CONSTRAINT match_holes_winning_score_valid CHECK (
    winning_score IS NULL OR winning_score BETWEEN 1 AND 20
  ),
  CONSTRAINT match_holes_skinz_awarded_valid CHECK (skinz_awarded >= 0),
  CONSTRAINT match_holes_carryover_before_valid CHECK (carryover_before >= 0),
  CONSTRAINT match_holes_carryover_after_valid CHECK (carryover_after >= 0),
  CONSTRAINT match_holes_pot_amount_valid CHECK (pot_amount >= 0),
  CONSTRAINT match_holes_game_data_object CHECK (jsonb_typeof(game_data) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS match_holes_match_number_current_unique
  ON match_holes (match_id, hole_number)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS match_holes_match_number_idx
  ON match_holes (match_id, hole_number);

CREATE TABLE IF NOT EXISTS match_player_holes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_hole_id UUID NOT NULL REFERENCES match_holes(id) ON DELETE CASCADE,
  match_player_id UUID NOT NULL REFERENCES match_players(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL,
  to_par SMALLINT NOT NULL,
  skinz_delta INTEGER NOT NULL DEFAULT 0,
  winnings_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
  oozle_winnings_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
  result_label TEXT NOT NULL,
  result_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT match_player_holes_score_valid CHECK (score BETWEEN 1 AND 20),
  CONSTRAINT match_player_holes_skinz_delta_valid CHECK (skinz_delta >= 0),
  CONSTRAINT match_player_holes_result_label_not_blank CHECK (BTRIM(result_label) <> ''),
  CONSTRAINT match_player_holes_result_data_object CHECK (jsonb_typeof(result_data) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS match_player_holes_hole_player_unique
  ON match_player_holes (match_hole_id, match_player_id);

CREATE INDEX IF NOT EXISTS match_player_holes_player_idx
  ON match_player_holes (match_player_id, match_hole_id);

CREATE TABLE IF NOT EXISTS match_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  payer_match_player_id UUID NOT NULL REFERENCES match_players(id) ON DELETE RESTRICT,
  recipient_match_player_id UUID NOT NULL REFERENCES match_players(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT match_settlements_different_players CHECK (
    payer_match_player_id <> recipient_match_player_id
  ),
  CONSTRAINT match_settlements_amount_valid CHECK (amount > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS match_settlements_match_pair_unique
  ON match_settlements (match_id, payer_match_player_id, recipient_match_player_id);

CREATE INDEX IF NOT EXISTS match_settlements_match_idx
  ON match_settlements (match_id);
