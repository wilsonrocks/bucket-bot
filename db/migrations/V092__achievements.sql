-- Achievements are awarded the first time a player does something (plays an
-- event, wins an event, ...). The rule for each achievement lives in code
-- (backend/logic/achievements/rules.ts) keyed by achievement.id; the text and
-- image are editable in admin.

CREATE TABLE public.achievement (
    id             text PRIMARY KEY,
    name           text NOT NULL,
    flavour_text   text NOT NULL,
    flavour_source text,
    image_key      text,
    display_order  integer NOT NULL,
    created_at     timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Awards are derived from results and reconciled by a scheduled sync, so rows
-- can be repointed (tourney_id/achieved_on) without losing announcement state.
CREATE TABLE public.player_achievement (
    player_id          integer NOT NULL REFERENCES public.player(id) ON DELETE CASCADE,
    achievement_id     text NOT NULL REFERENCES public.achievement(id) ON DELETE CASCADE,
    tourney_id         integer REFERENCES public.tourney(id) ON DELETE SET NULL,
    achieved_on        date NOT NULL,
    awarded_at         timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    discord_message_id text,
    PRIMARY KEY (player_id, achievement_id)
);

CREATE INDEX idx_player_achievement_achievement_id ON public.player_achievement USING btree (achievement_id);
CREATE INDEX idx_player_achievement_tourney_id ON public.player_achievement USING btree (tourney_id);
-- Announcement queue: oldest unannounced award first.
CREATE INDEX idx_player_achievement_unannounced ON public.player_achievement USING btree (awarded_at, player_id)
    WHERE discord_message_id IS NULL;

INSERT INTO public.achievement (id, name, flavour_text, flavour_source, display_order) VALUES
    ('first-event', 'Through the Breach', 'Every soul who steps through the Breach is changed by what waits on the other side.', NULL, 1),
    ('first-victory', 'Last One Standing', 'In Malifaux, the victors write the history. The rest become part of the scenery.', NULL, 2);
