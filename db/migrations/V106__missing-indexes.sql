-- player_identity.player_id: FK joined on almost every player/ranking query. It
-- used to be covered by the old (player_id, external_id) unique, which was
-- replaced by (identity_provider_id, external_id).
CREATE INDEX idx_player_identity_player_id ON player_identity(player_id);

-- ranking_snapshot: player rank history looks up by player_id alone, which the
-- (batch_id, player_id) primary key can't serve. Largest table after
-- ranking_snapshot_event, and it grows with every batch.
CREATE INDEX idx_ranking_snapshot_player_id ON ranking_snapshot(player_id);

-- Duplicate of the player_identity_provider_external_id_key unique index
DROP INDEX idx_player_identity_provider_external;
