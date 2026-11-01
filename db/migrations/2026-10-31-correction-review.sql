BEGIN;

ALTER TABLE slots ADD COLUMN IF NOT EXISTS correcao_at timestamptz;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS revisao_at timestamptz;

ALTER TABLE slots DROP CONSTRAINT IF EXISTS slots_correcao_require_provas_check;
ALTER TABLE slots ADD CONSTRAINT slots_correcao_require_provas_check
  CHECK (correcao_at IS NULL OR pistolado_at IS NOT NULL);
ALTER TABLE slots DROP CONSTRAINT IF EXISTS slots_revisao_require_correcao_check;
ALTER TABLE slots ADD CONSTRAINT slots_revisao_require_correcao_check
  CHECK (revisao_at IS NULL OR correcao_at IS NOT NULL);

ALTER TABLE slot_events DROP CONSTRAINT IF EXISTS slot_events_action_check;
ALTER TABLE slot_events ADD CONSTRAINT slot_events_action_check
  CHECK (action IN (
    'created', 'pistolado', 'pending',
    'correcao_confirmada', 'correcao_pendente',
    'revisao_confirmada', 'revisao_pendente',
    'notas_pistolado', 'notas_pending', 'deleted', 'restored'
  ));

COMMIT;
