CREATE TABLE
    identity_provider (id TEXT PRIMARY KEY, name TEXT NOT NULL);

INSERT INTO
    identity_provider (id, name)
VALUES
    ('LONGSHANKS', 'Longshanks'),
    ('BOT', 'Bag o Tools');

CREATE TABLE
    player_identity (
        id SERIAL PRIMARY KEY,
        player_id INT NOT NULL,
        external_id TEXT NOT NULL,
        identity_provider_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (player_id, external_id),
        FOREIGN KEY (identity_provider_id) REFERENCES identity_provider (id),
        FOREIGN KEY (player_id) REFERENCES player (id)
    );

INSERT INTO
    player_identity (player_id, external_id, identity_provider_id)
SELECT
    id AS player_id,
    longshanks_id,
    'LONGSHANKS'
FROM
    player
WHERE
    longshanks_id IS NOT NULL;

ALTER TABLE player
DROP COLUMN longshanks_id;