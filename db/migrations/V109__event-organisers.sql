-- More than one person can TO an event (#162): replace the single
-- organiser_discord_id columns with join tables.

CREATE TABLE tourney_organiser (
  tourney_id integer NOT NULL REFERENCES tourney(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL REFERENCES discord_user(discord_user_id) ON DELETE CASCADE,
  PRIMARY KEY (tourney_id, discord_user_id)
);

-- Achievements look up events by organiser.
CREATE INDEX idx_tourney_organiser_discord_user_id ON tourney_organiser (discord_user_id);

CREATE TABLE upcoming_event_organiser (
  upcoming_event_id integer NOT NULL REFERENCES upcoming_event(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL REFERENCES discord_user(discord_user_id) ON DELETE CASCADE,
  PRIMARY KEY (upcoming_event_id, discord_user_id)
);

-- The join skips empty strings and ids with no discord_user row, which the old
-- unconstrained columns allowed.
INSERT INTO tourney_organiser (tourney_id, discord_user_id)
SELECT tourney.id, discord_user.discord_user_id
FROM tourney
JOIN discord_user ON discord_user.discord_user_id = tourney.organiser_discord_id;

INSERT INTO upcoming_event_organiser (upcoming_event_id, discord_user_id)
SELECT upcoming_event.id, discord_user.discord_user_id
FROM upcoming_event
JOIN discord_user ON discord_user.discord_user_id = upcoming_event.organiser_discord_id;

ALTER TABLE tourney DROP COLUMN organiser_discord_id;
ALTER TABLE upcoming_event DROP COLUMN organiser_discord_id;
