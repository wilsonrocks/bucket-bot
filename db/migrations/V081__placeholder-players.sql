-- Replace (player_id, external_id) uniqueness with (identity_provider_id, external_id).
-- Previously the constraint was scoped per-player which made little sense; now each
-- provider+external_id combination is globally unique.
ALTER TABLE player_identity DROP CONSTRAINT player_identity_player_id_external_id_key;
CREATE UNIQUE INDEX player_identity_provider_external_id_key
  ON player_identity (identity_provider_id, external_id);

-- Backfill a placeholder player for every orphan identity.
-- nextval() advances the player sequence per-row so the sequence stays consistent;
-- we never need setval() afterwards.
CREATE TEMP TABLE _backfill_map ON COMMIT DROP AS
SELECT
  pi.id AS identity_id,
  nextval(pg_get_serial_sequence('player', 'id')) AS new_player_id,
  pi.provider_name AS name,
  CASE WHEN pi.identity_provider_id = 'LONGSHANKS' THEN pi.provider_name END AS longshanks_name
FROM player_identity pi
WHERE pi.player_id IS NULL;

INSERT INTO player (id, name, longshanks_name)
SELECT new_player_id, name, longshanks_name FROM _backfill_map;

UPDATE player_identity pi
SET player_id = m.new_player_id
FROM _backfill_map m
WHERE m.identity_id = pi.id;
