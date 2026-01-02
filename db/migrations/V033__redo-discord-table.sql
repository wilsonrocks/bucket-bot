DROP TABLE discord_user;
CREATE TABLE discord_user (
    discord_user_id TEXT PRIMARY KEY,
    discord_display_name TEXT,
    discord_nickname TEXT,
    discord_avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);