CREATE TABLE ranking_subscription (
  discord_user_id text PRIMARY KEY,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_notified_at timestamp
);
