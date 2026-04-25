CREATE TABLE feature_flag (
    flag TEXT PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO feature_flag (flag) VALUES ('TEAM_STATS');
