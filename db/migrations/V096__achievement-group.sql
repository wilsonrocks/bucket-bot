-- Groups achievements into sections on the player page. Named group_name
-- because GROUP is a reserved word.
ALTER TABLE public.achievement ADD COLUMN group_name text;

-- Per-faction achievements (V095) are grouped under their faction.
UPDATE public.achievement
SET group_name = faction.name
FROM public.faction
WHERE achievement.id LIKE faction.name_code || '\_%';

UPDATE public.achievement
SET group_name = 'General'
WHERE group_name IS NULL;

ALTER TABLE public.achievement ALTER COLUMN group_name SET NOT NULL;

-- Painting achievements. As in V094, names are PLACEHOLDER for the community to
-- choose and flavour text, source and image are left blank. Best painted counts
-- a win in any painting category.
INSERT INTO public.achievement (id, name, description, flavour_text, flavour_source, image_key, display_order, group_name) VALUES
    ('BEST_PAINTED',             'PLACEHOLDER', 'Win best painted at an event',                     '', NULL, NULL, 51, 'Painting'),
    ('BEST_PAINTED_GT',          'PLACEHOLDER', 'Win best painted at a GT',                         '', NULL, NULL, 52, 'Painting'),
    ('BEST_PAINTED_NATIONALS',   'PLACEHOLDER', 'Win best painted at a Nationals',                  '', NULL, NULL, 53, 'Painting'),
    ('PODIUM_PAINTER_NATIONALS', 'PLACEHOLDER', 'Finish in the top 3 for painting at a Nationals',  '', NULL, NULL, 54, 'Painting'),
    ('FIVE_BEST_PAINTED',        'PLACEHOLDER', 'Win best painted 5 times',                         '', NULL, NULL, 55, 'Painting'),
    ('TEN_BEST_PAINTED',         'PLACEHOLDER', 'Win best painted 10 times',                        '', NULL, NULL, 56, 'Painting');

-- TO-ing achievements: organising events, matched on the tourney's organiser
-- Discord id. Names are PLACEHOLDER, as above.
INSERT INTO public.achievement (id, name, description, flavour_text, flavour_source, image_key, display_order, group_name) VALUES
    ('FIRST_TO',  'PLACEHOLDER', 'Organise your first event', '', NULL, NULL, 61, 'TO-ing'),
    ('SECOND_TO', 'PLACEHOLDER', 'Organise 2 events',         '', NULL, NULL, 62, 'TO-ing'),
    ('FIVE_TO',   'PLACEHOLDER', 'Organise 5 events',         '', NULL, NULL, 63, 'TO-ing'),
    ('TEN_TO',    'PLACEHOLDER', 'Organise 10 events',        '', NULL, NULL, 64, 'TO-ing');
