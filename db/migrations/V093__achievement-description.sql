-- Plain description of what earns the achievement, shown alongside the flavour text.
ALTER TABLE public.achievement ADD COLUMN description text;

UPDATE public.achievement
SET description = CASE id
    WHEN 'first-event' THEN 'Attend 1 event'
    WHEN 'first-victory' THEN 'Win an event'
END;

ALTER TABLE public.achievement ALTER COLUMN description SET NOT NULL;
