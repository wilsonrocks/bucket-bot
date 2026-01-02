CREATE TABLE discord_user (
    id SERIAL PRIMARY KEY,
    discord_user_id TEXT NOT NULL UNIQUE,
    discord_display_name TEXT NOT NULL,
    discord_avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);