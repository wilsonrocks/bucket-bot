-- result: FK columns joined in nearly every ranking query
CREATE INDEX idx_result_tourney_id ON result(tourney_id);
CREATE INDEX idx_result_player_identity_id ON result(player_identity_id);
CREATE INDEX idx_result_faction_code ON result(faction_code);

-- membership: FK columns used in team/player queries and ranking generation
-- (the existing GiST exclusion constraint does not help btree joins)
CREATE INDEX idx_membership_player_id ON membership(player_id);
CREATE INDEX idx_membership_team_id ON membership(team_id);

-- player_identity: lookup by (identity_provider_id, external_id) in bot/longshanks imports
-- existing unique is on (player_id, external_id) which doesn't cover this pattern
CREATE INDEX idx_player_identity_provider_external ON player_identity(identity_provider_id, external_id);

-- ranking_snapshot_batch: filter by type_code to find latest batch
CREATE INDEX idx_ranking_snapshot_batch_type_code ON ranking_snapshot_batch(type_code);

-- team_ranking_snapshot: no primary key or indexes exist on this table
ALTER TABLE team_ranking_snapshot ADD PRIMARY KEY (batch_id, team_id);

-- team_ranking_snapshot_batch: same type_code lookup pattern as ranking_snapshot_batch
CREATE INDEX idx_team_ranking_snapshot_batch_type_code ON team_ranking_snapshot_batch(type_code);

-- discord_user: trigram similarity search across three columns using % operator
-- pg_trgm extension already enabled; separate GIN indexes needed for OR conditions
CREATE INDEX idx_discord_user_username_trgm ON discord_user USING gin(discord_username gin_trgm_ops);
CREATE INDEX idx_discord_user_display_name_trgm ON discord_user USING gin(discord_display_name gin_trgm_ops);
CREATE INDEX idx_discord_user_nickname_trgm ON discord_user USING gin(discord_nickname gin_trgm_ops);

-- remaining FK columns
CREATE INDEX idx_painting_category_tourney_id ON painting_category(tourney_id);
CREATE INDEX idx_painting_winner_player_id ON painting_winner(player_id);
CREATE INDEX idx_painting_winner_category_id ON painting_winner(category_id);
CREATE INDEX idx_ranking_snapshot_event_player_id ON ranking_snapshot_event(player_id);
CREATE INDEX idx_ranking_snapshot_event_tourney_id ON ranking_snapshot_event(tourney_id);
CREATE INDEX idx_tourney_bot_id ON tourney(bot_id);
CREATE INDEX idx_venue_region_id ON venue(region_id);
CREATE INDEX idx_team_venue_id ON team(venue_id);
CREATE INDEX idx_tourney_venue_id ON tourney(venue_id);
