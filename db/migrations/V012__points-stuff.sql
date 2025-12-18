ALTER TABLE result ADD COLUMN points FLOAT;

CREATE TABLE level (
    name TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

INSERT into level (name, description) VALUES
('Nationals', 'Top tier event with the highest level of competition'),
('GT', 'High level event with strong competition'),
('Local', 'Mid-level event with moderate competition');

ALTER TABLE tourney ADD COLUMN level_code TEXT REFERENCES level(name);

