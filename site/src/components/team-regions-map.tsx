import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { select } from "d3-selection";
import { timeFormat } from "d3-time-format";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "#/components/link";
import { TeamAvatar } from "#/components/team-avatar";
import { UK_BBOX } from "#/data/uk-bbox";
import type { UkRegionFeature } from "#/data/uk-regions-geo";

export type TeamRegionRow = {
  geojson_name: string;
  teamId: number;
  teamName: string;
  imageKey: string | null;
  brandColour: string | null;
  points: number;
  players: number;
  events: number;
};

const NO_POINTS_FILL = "#d1d5db";
const TILE_BG_FALLBACK = "#f3f4f6";
const TILE = 80;
// Letter-only tiles (teams without a logo) are smaller so the map reads as a
// pattern of initials rather than a few huge letters.
const LETTER_TILE = TILE / 2;

/**
 * A pattern's cell size: logo-sized if any team in it has a logo (cells in a shared
 * tie tile must all be the same size), letter-sized only when none do.
 */
export const tileSizeFor = (teams: TeamRegionRow[]) =>
  teams.some((t) => t.imageKey) ? TILE : LETTER_TILE;
// Logos fill their tiles edge to edge, so region borders need a dark outline to
// stay visible; the selected region gets a thicker accent outline on top.
const OUTLINE = "#1f2937";
const OUTLINE_WIDTH = 1.5;
const SELECTED_OUTLINE = "#2563eb";
const SELECTED_OUTLINE_WIDTH = 3.5;

const formatPanelDate = timeFormat("%d %b %Y");

export type RankedTeamRegionRow = TeamRegionRow & { rank: number };

/**
 * Points as compared for ranking. Totals are fractional, so two teams count as tied
 * when they'd display the same (to 1dp) rather than only on exact float equality —
 * otherwise the panel could show "446.1 pts" twice with different ranks.
 */
const pointsKey = (points: number) => Math.round(points * 10);

/** Tile pattern id for a region's leader(s); several ids means a shared tile. */
export const teamTileId = (teamIds: number[]) =>
  `team-tile-${teamIds.join("-")}`;

/**
 * Rows per region, best team first, with competition ranks (tied teams share a
 * rank and the next rank is skipped: 1, 1, 3). Ties are listed by name.
 */
export function groupByRegion(rows: TeamRegionRow[]) {
  const byRegion = new Map<string, RankedTeamRegionRow[]>();
  for (const row of rows) {
    const list = byRegion.get(row.geojson_name) ?? [];
    list.push({ ...row, rank: 0 });
    byRegion.set(row.geojson_name, list);
  }
  for (const list of byRegion.values()) {
    list.sort(
      (a, b) =>
        pointsKey(b.points) - pointsKey(a.points) ||
        a.teamName.localeCompare(b.teamName),
    );
    list.forEach((team, i) => {
      const prev = list[i - 1];
      team.rank =
        prev && pointsKey(prev.points) === pointsKey(team.points)
          ? prev.rank
          : i + 1;
    });
  }
  return byRegion;
}

/** Every team sharing first place in a region (usually just one). */
export const regionLeaders = (teams: RankedTeamRegionRow[] | undefined) =>
  (teams ?? []).filter((t) => t.rank === 1);

const formatPoints = (points: number) =>
  Number.isInteger(points) ? String(points) : points.toFixed(1);

function TeamTile({
  team,
  x,
  y,
  size,
}: {
  team: TeamRegionRow;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={size}
        height={size}
        fill={team.brandColour ?? TILE_BG_FALLBACK}
      />
      {team.imageKey ? (
        <image
          href={`${import.meta.env.VITE_ASSETS_URL}/${team.imageKey}-w150.webp`}
          // Fills the whole tile so logos butt up against each other; the brand
          // colour only shows where a non-square logo doesn't reach the edges.
          width={size}
          height={size}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.5}
          fontWeight={600}
          fill={team.brandColour ? "#fff" : "#111827"}
        >
          {team.teamName[0]}
        </text>
      )}
    </g>
  );
}

/**
 * One team tiles on its own; n tied teams share an n×n tile where cell (row, col)
 * shows team (row + col) mod n — a checkerboard for two, diagonal stripes beyond.
 */
function TeamTilePattern({ teams }: { teams: TeamRegionRow[] }) {
  const n = teams.length;
  const size = tileSizeFor(teams);
  const cells = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      cells.push(
        <TeamTile
          key={`${row}-${col}`}
          team={teams[(row + col) % n]}
          x={col * size}
          y={row * size}
          size={size}
        />,
      );
    }
  }
  return (
    <pattern
      id={teamTileId(teams.map((t) => t.teamId))}
      patternUnits="userSpaceOnUse"
      width={n * size}
      height={n * size}
    >
      {cells}
    </pattern>
  );
}

type TeamRegionsMapProps = {
  rows: TeamRegionRow[];
  /** YYYY-MM-DD; the window is the year ending here. */
  windowEnd: string;
};

export function TeamRegionsMap({ rows, windowEnd }: TeamRegionsMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Loaded on the client only, as in AnimatedRegions, to keep it out of SSR.
  const [features, setFeatures] = useState<UkRegionFeature[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("#/data/uk-regions-geo").then((m) => {
      if (!cancelled) setFeatures(m.ukRegionFeatures);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byRegion = useMemo(() => groupByRegion(rows), [rows]);
  // One pattern per distinct leader set (a single team, or a set of tied teams).
  const leaderSets = useMemo(() => {
    const seen = new Map<string, RankedTeamRegionRow[]>();
    for (const list of byRegion.values()) {
      const leaders = regionLeaders(list);
      if (leaders.length === 0) continue;
      const id = teamTileId(leaders.map((t) => t.teamId));
      if (!seen.has(id)) seen.set(id, leaders);
    }
    return [...seen.values()];
  }, [byRegion]);

  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );
  // The d3 handlers are attached once, so they go through refs.
  const hoverRef = useRef(setHoveredRegion);
  hoverRef.current = setHoveredRegion;
  const toggleSelectedRef = useRef((name: string) =>
    setSelectedRegion((prev) => (prev === name ? null : name)),
  );

  const fillFor = (name: string) => {
    const leaders = regionLeaders(byRegion.get(name));
    return leaders.length > 0
      ? `url(#${teamTileId(leaders.map((t) => t.teamId))})`
      : NO_POINTS_FILL;
  };
  const fillForRef = useRef(fillFor);
  fillForRef.current = fillFor;

  const width = 500;
  const height = Math.round(width * 1.4);

  useEffect(() => {
    if (!features || !svgRef.current) return;
    const projection = geoMercator().fitSize([width, height], UK_BBOX);
    const pathGen = geoPath().projection(projection);

    select(svgRef.current)
      .select<SVGGElement>("g.regions")
      .selectAll<SVGPathElement, UkRegionFeature>("path")
      .data(features)
      .join("path")
      .attr("d", (d) => pathGen(d as GeoPermissibleObjects) ?? "")
      .attr("fill", (d) => fillForRef.current(d.properties.rgn19nm))
      .attr("stroke", OUTLINE)
      .attr("stroke-width", OUTLINE_WIDTH)
      .attr("data-region", (d) => d.properties.rgn19nm)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.properties.rgn19nm} — show team points`)
      .attr("cursor", "pointer")
      .on("mouseenter", (_event, d) => hoverRef.current(d.properties.rgn19nm))
      .on("mouseleave", () => hoverRef.current(null))
      .on("click", (_event, d) =>
        toggleSelectedRef.current(d.properties.rgn19nm),
      )
      .on("keydown", (event: KeyboardEvent, d) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleSelectedRef.current(d.properties.rgn19nm);
      });
  }, [features, width, height]);

  // Fill and selection stroke in one pass (see AnimatedRegions / #110).
  useEffect(() => {
    if (!svgRef.current) return;
    select(svgRef.current)
      .selectAll<SVGPathElement, UkRegionFeature>("g.regions path")
      .attr("fill", (d) => fillForRef.current(d.properties.rgn19nm))
      .attr("stroke", (d) =>
        d.properties.rgn19nm === selectedRegion ? SELECTED_OUTLINE : OUTLINE,
      )
      .attr("stroke-width", (d) =>
        d.properties.rgn19nm === selectedRegion
          ? SELECTED_OUTLINE_WIDTH
          : OUTLINE_WIDTH,
      )
      // Draw the selected region last so neighbours don't paint over its outline.
      .filter((d) => d.properties.rgn19nm === selectedRegion)
      .raise();
  }, [byRegion, features, selectedRegion]);

  const hoveredLeaders = hoveredRegion
    ? regionLeaders(byRegion.get(hoveredRegion))
    : [];

  return (
    <div
      style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseLeave={() => setMousePos(null)}
    >
      <p className="mb-2.5 text-sm text-muted-foreground">
        Team with the most points scored at events in each region, year up to{" "}
        {formatPanelDate(new Date(windowEnd))}. Click a region for the
        breakdown.
      </p>
      <svg
        ref={svgRef}
        data-testid="team-regions-map"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxHeight: "70vh" }}
      >
        <defs>
          {leaderSets.map((teams) => (
            <TeamTilePattern
              key={teamTileId(teams.map((t) => t.teamId))}
              teams={teams}
            />
          ))}
        </defs>
        <g className="regions" />
      </svg>
      {hoveredRegion && mousePos && (
        <div
          style={{
            position: "absolute",
            left: mousePos.x + 12,
            top: mousePos.y - 8,
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 13,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {hoveredRegion} —{" "}
          {hoveredLeaders.length === 0
            ? "no team points"
            : `${hoveredLeaders.length > 1 ? "tied: " : ""}${hoveredLeaders
                .map((t) => t.teamName)
                .join(", ")} (${formatPoints(hoveredLeaders[0].points)} pts)`}
        </div>
      )}
      {selectedRegion && (
        <RegionTeamsPanel
          title={selectedRegion}
          teams={byRegion.get(selectedRegion) ?? []}
          windowEnd={windowEnd}
          onClose={() => setSelectedRegion(null)}
        />
      )}
    </div>
  );
}

type RegionTeamsPanelProps = {
  title: string;
  teams: RankedTeamRegionRow[];
  windowEnd: string;
  onClose: () => void;
};

function RegionTeamsPanel({
  title,
  teams,
  windowEnd,
  onClose,
}: RegionTeamsPanelProps) {
  return (
    <div
      className="mt-4 rounded-lg border border-border bg-surface p-4"
      data-testid="region-teams-panel"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Year up to {formatPanelDate(new Date(windowEnd))}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close team points"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-muted"
        >
          <X size={16} />
        </button>
      </div>
      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No team points here in this period.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {teams.map((team) => (
            <li key={team.teamId} className="flex items-center gap-3">
              <span className="w-5 text-right text-sm text-muted-foreground">
                {team.rank}
              </span>
              <TeamAvatar
                image_key={team.imageKey}
                name={team.teamName}
                size={28}
              />
              <div className="min-w-0 flex-1">
                <Link
                  to="/team/$id"
                  params={{ id: String(team.teamId) }}
                  search={{ tab: undefined }}
                  className="font-semibold"
                >
                  {team.teamName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {team.players} {team.players === 1 ? "player" : "players"} ·{" "}
                  {team.events} {team.events === 1 ? "event" : "events"}
                </p>
              </div>
              <span className="font-semibold tabular-nums">
                {formatPoints(team.points)} pts
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
