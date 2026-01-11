ALTER TABLE painting_winner DROP COLUMN tourney_id;

CREATE TABLE painting_category (
    id SERIAL PRIMARY KEY,
    tourney_id INTEGER NOT NULL REFERENCES tourney(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL);

ALTER TABLE painting_winner ADD COLUMN category_id INTEGER REFERENCES painting_category(id) ON DELETE  CASCADE;
