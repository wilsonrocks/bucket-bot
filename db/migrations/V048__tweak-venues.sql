ALTER TABLE venue ADD CONSTRAINT unique_venue_post_code UNIQUE (post_code);

ALTER TABLE tourney ADD COLUMN venue_id INT REFERENCES venue(id);