ALTER TABLE faction ADD longshanks_html_name TEXT;

UPDATE faction SET longshanks_html_name = name;

UPDATE faction SET longshanks_html_name = 'Explorers Society' WHERE name = 'Explorer''s Society';
