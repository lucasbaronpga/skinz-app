-- Block 7: Profilfarbe für den Avatar (Kürzel im farbigen Kreis).
-- Rückwärtskompatibel: Die bisherige App liest die Spalte nicht.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_color TEXT;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_avatar_color_valid;

ALTER TABLE users
  ADD CONSTRAINT users_avatar_color_valid
  CHECK (avatar_color IS NULL OR avatar_color ~ '^#[0-9a-f]{6}$');
