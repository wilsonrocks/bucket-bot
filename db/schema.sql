
\restrict aYHxGFB2kKdPS0fjTSB2sNRr6p7zvG1VNZJVrR3qOqQSle2iX13nQq5ChSjlxcv

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA tiger;

CREATE SCHEMA tiger_data;

CREATE SCHEMA topology;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.discord_user (
    discord_user_id text NOT NULL,
    discord_display_name text,
    discord_nickname text,
    discord_avatar_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    discord_username text
);

CREATE TABLE public.faction (
    id integer NOT NULL,
    name text NOT NULL,
    hex_code text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    longshanks_html_name text NOT NULL,
    name_code text NOT NULL,
    emoji text,
    short_name character(3) NOT NULL
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.faction_snapshot (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    faction_code text,
    rank integer NOT NULL,
    total_points integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    declarations integer DEFAULT 0 NOT NULL,
    points_per_declaration double precision,
    declaration_rate double precision NOT NULL
);

CREATE TABLE public.faction_snapshot_batch (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);

CREATE TABLE public.identity_provider (
    id text NOT NULL,
    name text NOT NULL
);

CREATE TABLE public.membership (
    id integer NOT NULL,
    player_id integer,
    team_id integer,
    join_date date DEFAULT CURRENT_DATE,
    left_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_captain boolean DEFAULT false NOT NULL
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.painting_category (
    id integer NOT NULL,
    tourney_id integer NOT NULL,
    name character varying(255) NOT NULL
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.painting_winner (
    id integer NOT NULL,
    player_id integer NOT NULL,
    "position" integer NOT NULL,
    model text NOT NULL,
    category_id integer,
    CONSTRAINT painting_winner_position_check CHECK (("position" > 0))
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.player (
    id integer NOT NULL,
    discord_id text,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    longshanks_name text
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.player_identity (
    id integer NOT NULL,
    player_id integer,
    external_id text NOT NULL,
    identity_provider_id text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    provider_name text NOT NULL
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.ranking_snapshot (
    batch_id integer NOT NULL,
    player_id integer NOT NULL,
    rank integer NOT NULL,
    total_points double precision NOT NULL
);

CREATE TABLE public.ranking_snapshot_batch (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type_code text NOT NULL
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.ranking_snapshot_event (
    batch_id integer NOT NULL,
    player_id integer NOT NULL,
    tourney_id integer NOT NULL
);

CREATE TABLE public.ranking_snapshot_type (
    code text NOT NULL,
    description text,
    generate boolean DEFAULT true,
    display boolean DEFAULT true,
    name text NOT NULL,
    display_order integer,
    hex_code text,
    discord_channel_id text
);

CREATE TABLE public.result (
    id integer NOT NULL,
    tourney_id integer,
    place integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    points double precision NOT NULL,
    faction_code text NOT NULL,
    rounds_played integer NOT NULL,
    player_identity_id integer NOT NULL,
    CONSTRAINT result_place_check CHECK ((place > 0))
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.team (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    venue_id integer,
    brand_colour text,
    image_key text
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.tier (
    code text NOT NULL,
    name text,
    description text
);

CREATE TABLE public.tourney (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    venue text,
    date date NOT NULL,
    longshanks_id text,
    submitted boolean DEFAULT false,
    number_of_players integer NOT NULL,
    is_submitted boolean DEFAULT false NOT NULL,
    discord_post_id text,
    venue_id integer,
    tier_code text DEFAULT 'EVENT'::text,
    rounds integer DEFAULT 3 NOT NULL,
    days integer DEFAULT 1 NOT NULL,
    organiser_discord_id text,
    bot_id text
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

CREATE TABLE public.venue (
    id integer NOT NULL,
    name text,
    town text,
    post_code text,
    geom public.geometry(Point,4326)
);

    AS integer
    NO MINVALUE
    NO MAXVALUE

ALTER TABLE ONLY public.discord_user
    ADD CONSTRAINT discord_user_pkey PRIMARY KEY (discord_user_id);

ALTER TABLE ONLY public.faction
    ADD CONSTRAINT faction_name_code_key UNIQUE (name_code);

ALTER TABLE ONLY public.faction
    ADD CONSTRAINT faction_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.faction
    ADD CONSTRAINT faction_short_name_key UNIQUE (short_name);

ALTER TABLE ONLY public.faction_snapshot
    ADD CONSTRAINT faction_snapshot_batch_id_faction_code_key UNIQUE (batch_id, faction_code);

ALTER TABLE ONLY public.faction_snapshot_batch
    ADD CONSTRAINT faction_snapshot_batch_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.faction_snapshot
    ADD CONSTRAINT faction_snapshot_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);

ALTER TABLE ONLY public.identity_provider
    ADD CONSTRAINT identity_provider_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.membership
    ADD CONSTRAINT membership_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.painting_category
    ADD CONSTRAINT painting_category_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.painting_winner
    ADD CONSTRAINT painting_winner_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.player_identity
    ADD CONSTRAINT player_identity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.player_identity
    ADD CONSTRAINT player_identity_player_id_external_id_key UNIQUE (player_id, external_id);

ALTER TABLE ONLY public.player
    ADD CONSTRAINT player_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ranking_snapshot_batch
    ADD CONSTRAINT ranking_snapshot_batch_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ranking_snapshot_event
    ADD CONSTRAINT ranking_snapshot_event_pkey PRIMARY KEY (batch_id, player_id, tourney_id);

ALTER TABLE ONLY public.ranking_snapshot
    ADD CONSTRAINT ranking_snapshot_pkey PRIMARY KEY (batch_id, player_id);

ALTER TABLE ONLY public.ranking_snapshot_type
    ADD CONSTRAINT ranking_snapshot_type_pkey PRIMARY KEY (code);

ALTER TABLE ONLY public.result
    ADD CONSTRAINT result_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.team
    ADD CONSTRAINT team_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tier
    ADD CONSTRAINT tier_pkey PRIMARY KEY (code);

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_discord_post_id_key UNIQUE (discord_post_id);

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_longshanks_id_key UNIQUE (longshanks_id);

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ranking_snapshot
    ADD CONSTRAINT unique_batch_player UNIQUE (batch_id, player_id);

ALTER TABLE ONLY public.player
    ADD CONSTRAINT unique_discord_id UNIQUE (discord_id);

ALTER TABLE ONLY public.venue
    ADD CONSTRAINT unique_venue_post_code UNIQUE (post_code);

ALTER TABLE ONLY public.venue
    ADD CONSTRAINT venue_pkey PRIMARY KEY (id);

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);

CREATE UNIQUE INDEX unique_display_order_true ON public.ranking_snapshot_type USING btree (display_order) WHERE (display = true);

ALTER TABLE ONLY public.faction_snapshot
    ADD CONSTRAINT faction_snapshot_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.faction_snapshot_batch(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.faction_snapshot
    ADD CONSTRAINT faction_snapshot_faction_code_fkey FOREIGN KEY (faction_code) REFERENCES public.faction(name_code) ON DELETE CASCADE;

ALTER TABLE ONLY public.player
    ADD CONSTRAINT fk_player_discord_id FOREIGN KEY (discord_id) REFERENCES public.discord_user(discord_user_id);

ALTER TABLE ONLY public.result
    ADD CONSTRAINT fk_result_faction_code FOREIGN KEY (faction_code) REFERENCES public.faction(name_code);

ALTER TABLE ONLY public.ranking_snapshot_batch
    ADD CONSTRAINT fk_type_code FOREIGN KEY (type_code) REFERENCES public.ranking_snapshot_type(code);

ALTER TABLE ONLY public.membership
    ADD CONSTRAINT membership_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.membership
    ADD CONSTRAINT membership_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.team(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.painting_category
    ADD CONSTRAINT painting_category_tourney_id_fkey FOREIGN KEY (tourney_id) REFERENCES public.tourney(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.painting_winner
    ADD CONSTRAINT painting_winner_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.painting_category(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.painting_winner
    ADD CONSTRAINT painting_winner_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.player_identity
    ADD CONSTRAINT player_identity_identity_provider_id_fkey FOREIGN KEY (identity_provider_id) REFERENCES public.identity_provider(id);

ALTER TABLE ONLY public.player_identity
    ADD CONSTRAINT player_identity_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id);

ALTER TABLE ONLY public.ranking_snapshot
    ADD CONSTRAINT ranking_snapshot_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ranking_snapshot_batch(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ranking_snapshot_event
    ADD CONSTRAINT ranking_snapshot_event_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ranking_snapshot_batch(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ranking_snapshot_event
    ADD CONSTRAINT ranking_snapshot_event_event_id_fkey FOREIGN KEY (tourney_id) REFERENCES public.tourney(id);

ALTER TABLE ONLY public.ranking_snapshot_event
    ADD CONSTRAINT ranking_snapshot_event_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id);

ALTER TABLE ONLY public.ranking_snapshot
    ADD CONSTRAINT ranking_snapshot_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id);

ALTER TABLE ONLY public.result
    ADD CONSTRAINT result_player_identity_id_fkey FOREIGN KEY (player_identity_id) REFERENCES public.player_identity(id);

ALTER TABLE ONLY public.result
    ADD CONSTRAINT result_tourney_id_fkey FOREIGN KEY (tourney_id) REFERENCES public.tourney(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.team
    ADD CONSTRAINT team_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venue(id);

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_tier_code_fkey FOREIGN KEY (tier_code) REFERENCES public.tier(code);

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venue(id);

\unrestrict aYHxGFB2kKdPS0fjTSB2sNRr6p7zvG1VNZJVrR3qOqQSle2iX13nQq5ChSjlxcv

