-- Seed achievements. Names are PLACEHOLDER for the community to choose; flavour
-- text, source and image are left blank to be filled in from admin. Each id
-- needs a matching rule in backend/logic/achievements/rules.ts before it can be
-- awarded.
INSERT INTO public.achievement (id, name, description, flavour_text, flavour_source, image_key, display_order) VALUES
    ('FIRST_EVENT',       'PLACEHOLDER', 'Play in your first event',                                   '', NULL, NULL, 1),
    ('SECOND_EVENT',      'PLACEHOLDER', 'Play in 2 events',                                           '', NULL, NULL, 2),
    ('FIVE_EVENTS',       'PLACEHOLDER', 'Play in 5 events',                                           '', NULL, NULL, 3),
    ('TEN_EVENTS',        'PLACEHOLDER', 'Play in 10 events',                                          '', NULL, NULL, 4),
    ('FIRST_GT',          'PLACEHOLDER', 'Play in a GT',                                               '', NULL, NULL, 5),
    ('FIRST_NATIONALS',   'PLACEHOLDER', 'Play in a Nationals',                                        '', NULL, NULL, 6),
    ('WOODEN_SPOON',      'PLACEHOLDER', 'Finish last at an event',                                    '', NULL, NULL, 7),
    ('BEST_IN_FACTION',   'PLACEHOLDER', 'Be the highest placed player of your faction at an event',   '', NULL, NULL, 8),
    ('PODIUM_EVENT',      'PLACEHOLDER', 'Finish in the top 3 at an event (not a GT or Nationals)',    '', NULL, NULL, 9),
    ('PODIUM_GT',         'PLACEHOLDER', 'Finish in the top 3 at a GT',                                '', NULL, NULL, 10),
    ('PODIUM_NATIONALS',  'PLACEHOLDER', 'Finish in the top 3 at a Nationals',                         '', NULL, NULL, 11),
    ('WIN_EVENT',         'PLACEHOLDER', 'Win an event (not a GT or Nationals)',                       '', NULL, NULL, 12),
    ('WIN_GT',            'PLACEHOLDER', 'Win a GT',                                                   '', NULL, NULL, 13),
    ('WIN_NATIONALS',     'PLACEHOLDER', 'Win a Nationals',                                            '', NULL, NULL, 14),
    ('DIFFERENT_FACTION', 'PLACEHOLDER', 'Declare a second faction at an event',                       '', NULL, NULL, 15),
    ('RAINBOW',           'PLACEHOLDER', 'Declare every faction across your events',                   '', NULL, NULL, 16),
    ('HALF_RAINBOW',      'PLACEHOLDER', 'Declare 4 different factions across your events',            '', NULL, NULL, 17),
    ('ASTBURYS_DREAM',    'PLACEHOLDER', 'Finish last and be best in faction at the same event',       '', NULL, NULL, 18);
