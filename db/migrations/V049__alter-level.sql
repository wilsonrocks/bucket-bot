ALTER TABLE tourney DROP COLUMN level_code;

DROP TABLE level;

CREATE TABLE tier (
    code TEXT PRIMARY KEY,
    name TEXT,
    description TEXT
);

INSERT INTO tier (code, name, description) VALUES
    ('EVENT', 'Event', 'Mid-level event with moderate competition'),
    ('GT', 'GT', 'High level event with strong competition'),
    ('NATIONALS', 'Nationals', 'Top tier event with the highest level of competition');

ALTER TABLE tourney ADD COLUMN tier_code TEXT REFERENCES tier(code) DEFAULT 'EVENT';

