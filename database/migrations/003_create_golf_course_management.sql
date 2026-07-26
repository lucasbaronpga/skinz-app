CREATE TABLE IF NOT EXISTS golf_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_club_id UUID NOT NULL REFERENCES golf_clubs(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  hole_count SMALLINT NOT NULL DEFAULT 18,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT golf_courses_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT golf_courses_hole_count_valid CHECK (hole_count IN (9, 18))
);

CREATE UNIQUE INDEX IF NOT EXISTS golf_courses_club_name_unique
  ON golf_courses (golf_club_id, LOWER(BTRIM(name)));

CREATE INDEX IF NOT EXISTS golf_courses_club_active_name_idx
  ON golf_courses (golf_club_id, is_active, name);

CREATE INDEX IF NOT EXISTS golf_courses_active_name_idx
  ON golf_courses (is_active, name);

CREATE TABLE IF NOT EXISTS golf_course_holes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_course_id UUID NOT NULL REFERENCES golf_courses(id) ON DELETE CASCADE,
  hole_number SMALLINT NOT NULL,
  par SMALLINT NOT NULL,
  handicap_index SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT golf_course_holes_number_valid CHECK (
    hole_number BETWEEN 1 AND 18
  ),
  CONSTRAINT golf_course_holes_par_valid CHECK (par BETWEEN 3 AND 6),
  CONSTRAINT golf_course_holes_handicap_index_valid CHECK (
    handicap_index IS NULL OR handicap_index BETWEEN 1 AND 18
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS golf_course_holes_course_number_unique
  ON golf_course_holes (golf_course_id, hole_number);

CREATE UNIQUE INDEX IF NOT EXISTS golf_course_holes_course_handicap_unique
  ON golf_course_holes (golf_course_id, handicap_index)
  WHERE handicap_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS golf_course_holes_course_id_idx
  ON golf_course_holes (golf_course_id);

CREATE TABLE IF NOT EXISTS golf_course_tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_course_id UUID NOT NULL REFERENCES golf_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  rating_category TEXT,
  course_rating NUMERIC(4,1),
  slope_rating SMALLINT,
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT golf_course_tees_name_not_blank CHECK (BTRIM(name) <> ''),
  CONSTRAINT golf_course_tees_color_not_blank CHECK (
    color IS NULL OR BTRIM(color) <> ''
  ),
  CONSTRAINT golf_course_tees_rating_category_not_blank CHECK (
    rating_category IS NULL OR BTRIM(rating_category) <> ''
  ),
  CONSTRAINT golf_course_tees_course_rating_valid CHECK (
    course_rating IS NULL OR course_rating BETWEEN 40.0 AND 100.0
  ),
  CONSTRAINT golf_course_tees_slope_rating_valid CHECK (
    slope_rating IS NULL OR slope_rating BETWEEN 55 AND 155
  ),
  CONSTRAINT golf_course_tees_display_order_valid CHECK (display_order >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS golf_course_tees_course_name_category_unique
  ON golf_course_tees (
    golf_course_id,
    LOWER(BTRIM(name)),
    LOWER(BTRIM(COALESCE(rating_category, '')))
  );

CREATE INDEX IF NOT EXISTS golf_course_tees_course_active_order_idx
  ON golf_course_tees (golf_course_id, is_active, display_order, name);

CREATE TABLE IF NOT EXISTS golf_course_tee_holes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_course_tee_id UUID NOT NULL REFERENCES golf_course_tees(id) ON DELETE CASCADE,
  golf_course_hole_id UUID NOT NULL REFERENCES golf_course_holes(id) ON DELETE CASCADE,
  length_meters SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT golf_course_tee_holes_length_valid CHECK (
    length_meters BETWEEN 1 AND 1000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS golf_course_tee_holes_tee_hole_unique
  ON golf_course_tee_holes (golf_course_tee_id, golf_course_hole_id);

CREATE INDEX IF NOT EXISTS golf_course_tee_holes_hole_id_idx
  ON golf_course_tee_holes (golf_course_hole_id);
