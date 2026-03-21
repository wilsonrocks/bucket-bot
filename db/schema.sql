--
-- PostgreSQL database dump
--

\restrict u2QXFEI7e7gZ64dR2onoMyWgBxmY9s8WIjCv0bkwlMsYvGo5iAhtxIXvRjJLdlQ

-- Dumped from database version 17.5 (Debian 17.5-1.pgdg110+1)
-- Dumped by pg_dump version 18.3 (Ubuntu 18.3-1.pgdg22.04+1)

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: tiger; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA tiger;


--
-- Name: tiger_data; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA tiger_data;


--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA topology;


--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: discord_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discord_user (
    discord_user_id text NOT NULL,
    discord_display_name text,
    discord_nickname text,
    discord_avatar_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    discord_username text
);


--
-- Name: faction; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: faction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faction_id_seq OWNED BY public.faction.id;


--
-- Name: faction_snapshot; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: faction_snapshot_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faction_snapshot_batch (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: faction_snapshot_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faction_snapshot_batch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faction_snapshot_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faction_snapshot_batch_id_seq OWNED BY public.faction_snapshot_batch.id;


--
-- Name: faction_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faction_snapshot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faction_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.faction_snapshot_id_seq OWNED BY public.faction_snapshot.id;


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: identity_provider; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_provider (
    id text NOT NULL,
    name text NOT NULL
);


--
-- Name: membership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership (
    id integer NOT NULL,
    player_id integer,
    team_id integer,
    join_date date DEFAULT CURRENT_DATE,
    left_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: membership_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.membership_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: membership_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.membership_id_seq OWNED BY public.membership.id;


--
-- Name: painting_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.painting_category (
    id integer NOT NULL,
    tourney_id integer NOT NULL,
    name character varying(255) NOT NULL
);


--
-- Name: painting_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.painting_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: painting_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.painting_category_id_seq OWNED BY public.painting_category.id;


--
-- Name: painting_winner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.painting_winner (
    id integer NOT NULL,
    player_id integer NOT NULL,
    "position" integer NOT NULL,
    model text NOT NULL,
    category_id integer,
    CONSTRAINT painting_winner_position_check CHECK (("position" > 0))
);


--
-- Name: painting_winner_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.painting_winner_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: painting_winner_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.painting_winner_id_seq OWNED BY public.painting_winner.id;


--
-- Name: player; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player (
    id integer NOT NULL,
    discord_id text,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    longshanks_name text
);


--
-- Name: player_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_id_seq OWNED BY public.player.id;


--
-- Name: player_identity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_identity (
    id integer NOT NULL,
    player_id integer,
    external_id text NOT NULL,
    identity_provider_id text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    provider_name text NOT NULL
);


--
-- Name: player_identity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_identity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_identity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_identity_id_seq OWNED BY public.player_identity.id;


--
-- Name: ranking_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranking_snapshot (
    batch_id integer NOT NULL,
    player_id integer NOT NULL,
    rank integer NOT NULL,
    total_points double precision NOT NULL
);


--
-- Name: ranking_snapshot_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranking_snapshot_batch (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type_code text NOT NULL
);


--
-- Name: ranking_snapshot_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ranking_snapshot_batch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ranking_snapshot_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ranking_snapshot_batch_id_seq OWNED BY public.ranking_snapshot_batch.id;


--
-- Name: ranking_snapshot_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ranking_snapshot_event (
    batch_id integer NOT NULL,
    player_id integer NOT NULL,
    tourney_id integer NOT NULL
);


--
-- Name: ranking_snapshot_type; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: result; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: result_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.result_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.result_id_seq OWNED BY public.result.id;


--
-- Name: team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: team_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_id_seq OWNED BY public.team.id;


--
-- Name: tier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tier (
    code text NOT NULL,
    name text,
    description text
);


--
-- Name: tourney; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: tourney_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tourney_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tourney_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tourney_id_seq OWNED BY public.tourney.id;


--
-- Name: venue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venue (
    id integer NOT NULL,
    name text,
    town text,
    post_code text,
    geom public.geometry(Point,4326)
);


--
-- Name: venue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.venue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: venue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.venue_id_seq OWNED BY public.venue.id;


--
-- Name: faction id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction ALTER COLUMN id SET DEFAULT nextval('public.faction_id_seq'::regclass);


--
-- Name: faction_snapshot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction_snapshot ALTER COLUMN id SET DEFAULT nextval('public.faction_snapshot_id_seq'::regclass);


--
-- Name: faction_snapshot_batch id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction_snapshot_batch ALTER COLUMN id SET DEFAULT nextval('public.faction_snapshot_batch_id_seq'::regclass);


--
-- Name: membership id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership ALTER COLUMN id SET DEFAULT nextval('public.membership_id_seq'::regclass);


--
-- Name: painting_category id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.painting_category ALTER COLUMN id SET DEFAULT nextval('public.painting_category_id_seq'::regclass);


--
-- Name: painting_winner id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.painting_winner ALTER COLUMN id SET DEFAULT nextval('public.painting_winner_id_seq'::regclass);


--
-- Name: player id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player ALTER COLUMN id SET DEFAULT nextval('public.player_id_seq'::regclass);


--
-- Name: player_identity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_identity ALTER COLUMN id SET DEFAULT nextval('public.player_identity_id_seq'::regclass);


--
-- Name: ranking_snapshot_batch id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot_batch ALTER COLUMN id SET DEFAULT nextval('public.ranking_snapshot_batch_id_seq'::regclass);


--
-- Name: result id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.result ALTER COLUMN id SET DEFAULT nextval('public.result_id_seq'::regclass);


--
-- Name: team id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team ALTER COLUMN id SET DEFAULT nextval('public.team_id_seq'::regclass);


--
-- Name: tourney id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tourney ALTER COLUMN id SET DEFAULT nextval('public.tourney_id_seq'::regclass);


--
-- Name: venue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue ALTER COLUMN id SET DEFAULT nextval('public.venue_id_seq'::regclass);


--
-- Name: discord_user discord_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discord_user
    ADD CONSTRAINT discord_user_pkey PRIMARY KEY (discord_user_id);


--
-- Name: faction faction_name_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction
    ADD CONSTRAINT faction_name_code_key UNIQUE (name_code);


--
-- Name: faction faction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction
    ADD CONSTRAINT faction_pkey PRIMARY KEY (id);


--
-- Name: faction faction_short_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction
    ADD CONSTRAINT faction_short_name_key UNIQUE (short_name);


--
-- Name: faction_snapshot faction_snapshot_batch_id_faction_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction_snapshot
    ADD CONSTRAINT faction_snapshot_batch_id_faction_code_key UNIQUE (batch_id, faction_code);


--
-- Name: faction_snapshot_batch faction_snapshot_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction_snapshot_batch
    ADD CONSTRAINT faction_snapshot_batch_pkey PRIMARY KEY (id);


--
-- Name: faction_snapshot faction_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction_snapshot
    ADD CONSTRAINT faction_snapshot_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: identity_provider identity_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_provider
    ADD CONSTRAINT identity_provider_pkey PRIMARY KEY (id);


--
-- Name: membership membership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership
    ADD CONSTRAINT membership_pkey PRIMARY KEY (id);


--
-- Name: painting_category painting_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.painting_category
    ADD CONSTRAINT painting_category_pkey PRIMARY KEY (id);


--
-- Name: painting_winner painting_winner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.painting_winner
    ADD CONSTRAINT painting_winner_pkey PRIMARY KEY (id);


--
-- Name: player_identity player_identity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_identity
    ADD CONSTRAINT player_identity_pkey PRIMARY KEY (id);


--
-- Name: player_identity player_identity_player_id_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_identity
    ADD CONSTRAINT player_identity_player_id_external_id_key UNIQUE (player_id, external_id);


--
-- Name: player player_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player
    ADD CONSTRAINT player_pkey PRIMARY KEY (id);


--
-- Name: ranking_snapshot_batch ranking_snapshot_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot_batch
    ADD CONSTRAINT ranking_snapshot_batch_pkey PRIMARY KEY (id);


--
-- Name: ranking_snapshot_event ranking_snapshot_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot_event
    ADD CONSTRAINT ranking_snapshot_event_pkey PRIMARY KEY (batch_id, player_id, tourney_id);


--
-- Name: ranking_snapshot ranking_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot
    ADD CONSTRAINT ranking_snapshot_pkey PRIMARY KEY (batch_id, player_id);


--
-- Name: ranking_snapshot_type ranking_snapshot_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot_type
    ADD CONSTRAINT ranking_snapshot_type_pkey PRIMARY KEY (code);


--
-- Name: result result_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.result
    ADD CONSTRAINT result_pkey PRIMARY KEY (id);


--
-- Name: team team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team
    ADD CONSTRAINT team_pkey PRIMARY KEY (id);


--
-- Name: tier tier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tier
    ADD CONSTRAINT tier_pkey PRIMARY KEY (code);


--
-- Name: tourney tourney_discord_post_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_discord_post_id_key UNIQUE (discord_post_id);


--
-- Name: tourney tourney_longshanks_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_longshanks_id_key UNIQUE (longshanks_id);


--
-- Name: tourney tourney_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_pkey PRIMARY KEY (id);


--
-- Name: ranking_snapshot unique_batch_player; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot
    ADD CONSTRAINT unique_batch_player UNIQUE (batch_id, player_id);


--
-- Name: player unique_discord_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player
    ADD CONSTRAINT unique_discord_id UNIQUE (discord_id);


--
-- Name: venue unique_venue_post_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue
    ADD CONSTRAINT unique_venue_post_code UNIQUE (post_code);


--
-- Name: venue venue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venue
    ADD CONSTRAINT venue_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: unique_display_order_true; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_display_order_true ON public.ranking_snapshot_type USING btree (display_order) WHERE (display = true);


--
-- Name: faction_snapshot faction_snapshot_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction_snapshot
    ADD CONSTRAINT faction_snapshot_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.faction_snapshot_batch(id) ON DELETE CASCADE;


--
-- Name: faction_snapshot faction_snapshot_faction_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faction_snapshot
    ADD CONSTRAINT faction_snapshot_faction_code_fkey FOREIGN KEY (faction_code) REFERENCES public.faction(name_code) ON DELETE CASCADE;


--
-- Name: player fk_player_discord_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player
    ADD CONSTRAINT fk_player_discord_id FOREIGN KEY (discord_id) REFERENCES public.discord_user(discord_user_id);


--
-- Name: result fk_result_faction_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.result
    ADD CONSTRAINT fk_result_faction_code FOREIGN KEY (faction_code) REFERENCES public.faction(name_code);


--
-- Name: ranking_snapshot_batch fk_type_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot_batch
    ADD CONSTRAINT fk_type_code FOREIGN KEY (type_code) REFERENCES public.ranking_snapshot_type(code);


--
-- Name: membership membership_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership
    ADD CONSTRAINT membership_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id) ON DELETE CASCADE;


--
-- Name: membership membership_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership
    ADD CONSTRAINT membership_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.team(id) ON DELETE CASCADE;


--
-- Name: painting_category painting_category_tourney_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.painting_category
    ADD CONSTRAINT painting_category_tourney_id_fkey FOREIGN KEY (tourney_id) REFERENCES public.tourney(id) ON DELETE CASCADE;


--
-- Name: painting_winner painting_winner_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.painting_winner
    ADD CONSTRAINT painting_winner_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.painting_category(id) ON DELETE CASCADE;


--
-- Name: painting_winner painting_winner_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.painting_winner
    ADD CONSTRAINT painting_winner_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id) ON DELETE CASCADE;


--
-- Name: player_identity player_identity_identity_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_identity
    ADD CONSTRAINT player_identity_identity_provider_id_fkey FOREIGN KEY (identity_provider_id) REFERENCES public.identity_provider(id);


--
-- Name: player_identity player_identity_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_identity
    ADD CONSTRAINT player_identity_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id);


--
-- Name: ranking_snapshot ranking_snapshot_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot
    ADD CONSTRAINT ranking_snapshot_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ranking_snapshot_batch(id) ON DELETE CASCADE;


--
-- Name: ranking_snapshot_event ranking_snapshot_event_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot_event
    ADD CONSTRAINT ranking_snapshot_event_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ranking_snapshot_batch(id) ON DELETE CASCADE;


--
-- Name: ranking_snapshot_event ranking_snapshot_event_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot_event
    ADD CONSTRAINT ranking_snapshot_event_event_id_fkey FOREIGN KEY (tourney_id) REFERENCES public.tourney(id);


--
-- Name: ranking_snapshot_event ranking_snapshot_event_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot_event
    ADD CONSTRAINT ranking_snapshot_event_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id);


--
-- Name: ranking_snapshot ranking_snapshot_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ranking_snapshot
    ADD CONSTRAINT ranking_snapshot_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id);


--
-- Name: result result_player_identity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.result
    ADD CONSTRAINT result_player_identity_id_fkey FOREIGN KEY (player_identity_id) REFERENCES public.player_identity(id);


--
-- Name: result result_tourney_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.result
    ADD CONSTRAINT result_tourney_id_fkey FOREIGN KEY (tourney_id) REFERENCES public.tourney(id) ON DELETE CASCADE;


--
-- Name: tourney tourney_tier_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_tier_code_fkey FOREIGN KEY (tier_code) REFERENCES public.tier(code);


--
-- Name: tourney tourney_venue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tourney
    ADD CONSTRAINT tourney_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venue(id);


--
-- PostgreSQL database dump complete
--

\unrestrict u2QXFEI7e7gZ64dR2onoMyWgBxmY9s8WIjCv0bkwlMsYvGo5iAhtxIXvRjJLdlQ

