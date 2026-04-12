-- New columns
ALTER TABLE ranking_snapshot ADD COLUMN rank_change INTEGER NULL;
ALTER TABLE ranking_snapshot ADD COLUMN new_player BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE faction_snapshot ADD COLUMN rank_change INTEGER NULL;

-- Backfill ranking_snapshot: rank_change and new_player
UPDATE ranking_snapshot rs
SET
  rank_change = (
    SELECT prev.rank - rs.rank
    FROM ranking_snapshot prev
    INNER JOIN ranking_snapshot_batch prev_b ON prev.batch_id = prev_b.id
    WHERE prev.player_id = rs.player_id
      AND prev_b.id = (
        SELECT MAX(id) FROM ranking_snapshot_batch
        WHERE type_code = (SELECT type_code FROM ranking_snapshot_batch WHERE id = rs.batch_id)
          AND id < rs.batch_id
      )
  ),
  new_player = NOT EXISTS (
    SELECT 1 FROM ranking_snapshot prior
    INNER JOIN ranking_snapshot_batch prior_b ON prior.batch_id = prior_b.id
    WHERE prior.player_id = rs.player_id
      AND prior_b.type_code = (SELECT type_code FROM ranking_snapshot_batch WHERE id = rs.batch_id)
      AND prior.batch_id < rs.batch_id
  );

-- Backfill faction_snapshot: rank_change
UPDATE faction_snapshot fs
SET rank_change = (
  SELECT prev.rank - fs.rank
  FROM faction_snapshot prev
  WHERE prev.faction_code = fs.faction_code
    AND prev.batch_id = (
      SELECT MAX(id) FROM faction_snapshot_batch WHERE id < fs.batch_id
    )
);
