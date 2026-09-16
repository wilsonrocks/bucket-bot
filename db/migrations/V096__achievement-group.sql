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
