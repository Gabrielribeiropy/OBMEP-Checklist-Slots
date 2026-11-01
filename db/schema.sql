CREATE TABLE IF NOT EXISTS years (
  year integer PRIMARY KEY CHECK (year BETWEEN 2005 AND 2100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year integer NOT NULL REFERENCES years(year),
  number integer NOT NULL CHECK (number BETWEEN 1 AND 999999),
  level smallint,
  pistolado_at timestamptz,
  pistolado_by text,
  correcao_at timestamptz,
  revisao_at timestamptz,
  notas_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, number)
);

CREATE INDEX IF NOT EXISTS slots_year_active_idx ON slots(year, number) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS slot_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slot_id bigint NOT NULL REFERENCES slots(id),
  year integer NOT NULL,
  number integer NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'pistolado', 'pending', 'correcao_confirmada', 'correcao_pendente', 'revisao_confirmada', 'revisao_pendente', 'notas_pistolado', 'notas_pending', 'deleted', 'restored')),
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS slot_events_year_date_idx ON slot_events(year, created_at DESC);

ALTER TABLE slots ADD COLUMN IF NOT EXISTS notas_at timestamptz;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS correcao_at timestamptz;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS revisao_at timestamptz;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS level smallint;
ALTER TABLE slot_events DROP CONSTRAINT IF EXISTS slot_events_action_check;
ALTER TABLE slot_events ADD CONSTRAINT slot_events_action_check
  CHECK (action IN ('created', 'pistolado', 'pending', 'correcao_confirmada', 'correcao_pendente', 'revisao_confirmada', 'revisao_pendente', 'notas_pistolado', 'notas_pending', 'deleted', 'restored'));

CREATE TABLE IF NOT EXISTS public_action_limits (
  source_hash text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0
);

INSERT INTO years (year) VALUES (2026) ON CONFLICT DO NOTHING;

ALTER TABLE slots DROP CONSTRAINT IF EXISTS slots_lotes_2026_check;
ALTER TABLE slots ADD CONSTRAINT slots_lotes_2026_check CHECK (
  year <> 2026 OR
  (level IS NOT NULL AND level BETWEEN 1 AND 3) OR
  (level IS NULL AND (
    number BETWEEN 100 AND 180 OR
    number BETWEEN 200 AND 280 OR
    number BETWEEN 300 AND 380
  ))
);
ALTER TABLE slots DROP CONSTRAINT IF EXISTS slots_level_check;
ALTER TABLE slots ADD CONSTRAINT slots_level_check
  CHECK (level IS NULL OR level BETWEEN 1 AND 3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slots_notas_require_provas_check') THEN
    ALTER TABLE slots ADD CONSTRAINT slots_notas_require_provas_check
      CHECK (notas_at IS NULL OR pistolado_at IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slots_correcao_require_provas_check') THEN
    ALTER TABLE slots ADD CONSTRAINT slots_correcao_require_provas_check
      CHECK (correcao_at IS NULL OR pistolado_at IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slots_revisao_require_correcao_check') THEN
    ALTER TABLE slots ADD CONSTRAINT slots_revisao_require_correcao_check
      CHECK (revisao_at IS NULL OR correcao_at IS NOT NULL);
  END IF;
END $$;

INSERT INTO slots (year, number)
SELECT 2026, number FROM (
  SELECT generate_series(100, 180) AS number
  UNION ALL SELECT generate_series(200, 280)
  UNION ALL SELECT generate_series(300, 380)
) allowed
ON CONFLICT (year, number) DO NOTHING;

ALTER TABLE years ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_action_limits ENABLE ROW LEVEL SECURITY;
