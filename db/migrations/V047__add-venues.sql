CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE venue (
    id SERIAL PRIMARY KEY,
  name TEXT,
  town TEXT,
  post_code TEXT,
  geom geometry(POINT, 4326)
);