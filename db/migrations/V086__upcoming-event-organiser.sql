-- The tournament organiser (TO) for an upcoming event, stored as a Discord user
-- id to match tourney.organiser_discord_id. A ranking reporter assigns the TO;
-- that TO can then log in and edit the event (e.g. set the venue), mirroring how
-- team captains manage their own team.

ALTER TABLE public.upcoming_event
    ADD COLUMN organiser_discord_id text;
