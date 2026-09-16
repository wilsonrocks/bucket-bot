-- Per-faction achievements, e.g. RESSERS_PODIUM, THUNDERS_FIRST_EVENT. As in
-- V094, names are PLACEHOLDER for the community to choose and flavour text,
-- source and image are left blank to be filled in from admin. Rules are
-- generated per faction in backend/logic/achievements/rules.ts.
INSERT INTO public.achievement (id, name, description, flavour_text, flavour_source, image_key, display_order)
SELECT
    faction.name_code || '_' || kind.suffix,
    'PLACEHOLDER',
    format(kind.description, faction.name),
    '',
    NULL,
    NULL,
    100 + row_number() OVER (ORDER BY faction.name, kind.sort)
FROM public.faction
CROSS JOIN (VALUES
    (1, 'FIRST_EVENT',     'Play an event as %s'),
    (2, 'FIVE_EVENTS',     'Play 5 events as %s'),
    (3, 'TEN_EVENTS',      'Play 10 events as %s'),
    (4, 'BEST_IN_FACTION', 'Be the highest placed %s player at an event'),
    (5, 'PODIUM',          'Finish in the top 3 at any event as %s'),
    (6, 'WINNER',          'Win any event as %s')
) AS kind (sort, suffix, description);
