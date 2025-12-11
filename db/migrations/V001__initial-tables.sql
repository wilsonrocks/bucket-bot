CREATE TABLE venue (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    post_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE player (
    id SERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL,
    discord_username TEXT NOT NULL, -- on UK Malifaux Server
    longshanks_id TEXT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE tourney (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    venue_id INTEGER REFERENCES venue(id) ON DELETE SET NULL,
    best_painted INTEGER REFERENCES player(id) ON DELETE SET NULL,
    best_sport INTEGER REFERENCES player(id) ON DELETE SET NULL
);

CREATE TABLE result (
    id SERIAL PRIMARY KEY,
    tourney_id INTEGER REFERENCES tourney(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES player(id) ON DELETE CASCADE,
    place INTEGER CHECK (place > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    
);

CREATE TABLE membership (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES player(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES team(id) ON DELETE CASCADE,
    join_date DATE DEFAULT CURRENT_DATE,
    left_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

