CREATE TABLE
    region (
        id SERIAL PRIMARY KEY,
        postcodes_api_name TEXT UNIQUE NOT NULL,
        geojson_name TEXT UNIQUE NOT NULL
    );

INSERT INTO
    public.region (id, postcodes_api_name, geojson_name)
VALUES
    (1, 'North East', 'North East'),
    (2, 'North West', 'North West'),
    (
        3,
        'Yorkshire and The Humber',
        'Yorkshire and the Humber'
    ),
    (4, 'East Midlands', 'East Midlands'),
    (5, 'West Midlands', 'West Midlands'),
    (6, 'East of England', 'East'),
    (7, 'London', 'London'),
    (8, 'South East', 'South East'),
    (9, 'South West', 'South West'),
    (10, 'Northern Ireland', 'Northern Ireland');

INSERT INTO
    public.region (id, postcodes_api_name, geojson_name)
VALUES
    (11, 'Scotland', 'Scotland'),
    (12, 'Wales', 'Wales');

ALTER TABLE venue
ADD COLUMN region_id INTEGER REFERENCES region (id);