ALTER TABLE ranking_snapshot
ADD CONSTRAINT unique_batch_player
UNIQUE (batch_id, player_id);