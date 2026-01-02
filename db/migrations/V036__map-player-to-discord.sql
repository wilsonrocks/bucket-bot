ALTER TABLE player
ADD CONSTRAINT fk_player_discord_id
FOREIGN KEY (discord_id)
REFERENCES discord_user(discord_user_id);