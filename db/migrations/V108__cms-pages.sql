-- CMS static pages. A page is the identity (plus settings that aren't versioned);
-- every save appends a page_version row, and the highest version is live.
CREATE TABLE page (
  id serial PRIMARY KEY,
  -- Current URL, copied from the latest version on each save so uniqueness is
  -- enforced by the database and the site can look pages up by URL directly.
  url text NOT NULL UNIQUE,
  visible boolean NOT NULL DEFAULT true,
  -- Position in the site navbar; null means the page isn't in the navbar.
  nav_order integer,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE page_version (
  id serial PRIMARY KEY,
  page_id integer NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  url text NOT NULL CHECK (url ~ '^(/[a-z0-9]+(-[a-z0-9]+)*)+$'),
  title text NOT NULL CHECK (length(title) > 0),
  description text NOT NULL,
  -- ProseMirror (Tiptap) document JSON.
  content jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Discord user id of the editor; null for system-seeded versions.
  created_by text,
  CONSTRAINT page_version_page_id_version_key UNIQUE (page_id, version)
);

-- Old-URL lookups, for redirecting renamed pages.
CREATE INDEX idx_page_version_url ON page_version (url);

-- Seed the previously hardcoded How It Works page.
WITH new_page AS (
  INSERT INTO page (url, nav_order) VALUES ('/how-it-works', 1) RETURNING id
)
INSERT INTO page_version (page_id, version, url, title, description, content)
SELECT
  id,
  1,
  '/how-it-works',
  'How It Works',
  'How the UK Malifaux ranking system works — event eligibility, points, and the rolling-year window.',
  $json$ {
    "type": "doc",
    "content": [
      {"type": "paragraph", "content": [{"type": "text", "text": "Rankings and earning points are a key driver for many in the community and we want to simplify the process so you can set yourself goals and challenges throughout the year. Outlined below are the core requirements for an event to be eligible for rankings:"}]},
      {"type": "bulletList", "content": [
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Must be at least 3 rounds"}]}]},
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Must have at least 8 players"}]}]},
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Should be advertised on at least two platforms (Discord, Facebook, Wyrd Forums, as examples)"}]}]}
      ]},
      {"type": "paragraph", "content": [{"type": "text", "text": "Each player's final score will be made up of their best five events across the year."}]},
      {"type": "paragraph", "content": [
        {"type": "text", "text": "Players who have attended fewer than five eligible events in the last year are still ranked, but on fewer results. The "},
        {"type": "text", "marks": [{"type": "bold"}], "text": "5+ events only"},
        {"type": "text", "text": " checkbox on the rankings page hides them, so you can compare like with like."}
      ]},
      {"type": "paragraph", "content": [{"type": "text", "text": "Each event will be worth a starting point of 100 points. This is based on 16 players and a 3 round event. The person that finishes first will be awarded 100 points, the person in last place will be awarded 5 points. The other points will be equally divided amongst all other positions."}]},
      {"type": "paragraph", "content": [{"type": "text", "text": "If there are more than 16 players, the difference in points between places will be smaller. For example, in a 16-player event the person finishing 8th will be awarded 55.67 points, whereas in a 28-player event they will be awarded 75.37 points. If there are fewer than 16 players, there will be a 1 point deduction for each player less — so an 8-player event would be worth 92 points to the winner."}]},
      {"type": "paragraph", "content": [{"type": "text", "text": "As a community, we recognise that a bigger commitment should be rewarded and therefore there are some modifications to the maximum point scoring listed below, based on a 16-player event:"}]},
      {"type": "bulletList", "content": [
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "1 Day Event with 4 Rounds – 110 points"}]}]},
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "2 Day Event with 5 or more Rounds – 120 points"}]}]},
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "GT Event (typically 2 days, 6 rounds) – 120 points, whatever the number of rounds"}]}]},
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "UK Malifaux Nationals (typically 2 days, 6 rounds) – 130 points, whatever the number of rounds"}]}]}
      ]}
    ]
  }$json$::jsonb
FROM new_page;
