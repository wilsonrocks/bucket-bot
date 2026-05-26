import { createFileRoute } from "@tanstack/react-router";
import { SITE_NAME, seo } from "#/helpers/seo";
import {
  fetchCommunityStats,
  fetchFactionRankings,
  fetchRankings,
  fetchRecentPainting,
  fetchRegionsOverTime,
  fetchTeamRankings,
  fetchTeams,
  fetchTourneys,
  fetchTourney,
} from "#/queries";
import { CommunityStatsCard } from "#/components/home/community-stats-card";
import { FactionCard } from "#/components/home/faction-card";
import { PaintingHighlightCard } from "#/components/home/painting-highlight-card";
import { RecentEventCard } from "#/components/home/recent-event-card";
import { RegionsMapCard } from "#/components/home/regions-map-card";
import { TeamStandingsCard } from "#/components/home/team-standings-card";
import { TopPlayersCard } from "#/components/home/top-players-card";
import ukRegionsRaw from "#/data/ukRegions";

function rewindCoords(coords: number[][]): number[][] {
  let area = 0;
  for (let i = 0, n = coords.length - 1; i < n; i++) {
    area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
  }
  return area > 0 ? [...coords].reverse() : coords;
}

type GeoJsonFeature = {
  type: string;
  geometry: { type: string; coordinates: unknown };
  properties: { rgn19nm: string; [key: string]: unknown };
};

function rewindFeature(feature: GeoJsonFeature): GeoJsonFeature {
  const geom = feature.geometry;
  if (geom.type === "Polygon") {
    const rings = geom.coordinates as number[][][];
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: rings.map((r, i) =>
          i === 0 ? rewindCoords(r) : rewindCoords(r).reverse(),
        ),
      },
    };
  }
  if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates as number[][][][];
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: polys.map((p) =>
          p.map((r, i) =>
            i === 0 ? rewindCoords(r) : rewindCoords(r).reverse(),
          ),
        ),
      },
    };
  }
  return feature;
}

export const Route = createFileRoute("/")({
  loader: async () => {
    const [
      rankings,
      teamRankings,
      teams,
      factionRankings,
      tourneys,
      painting,
      communityStats,
      regionsOverTime,
    ] = await Promise.all([
      fetchRankings({ data: { typeCode: "ROLLING_YEAR" } }),
      fetchTeamRankings({ data: { typeCode: "ROLLING_YEAR" } }),
      fetchTeams(),
      fetchFactionRankings(),
      fetchTourneys(),
      fetchRecentPainting(),
      fetchCommunityStats(),
      fetchRegionsOverTime(),
    ]);

    const latestTourney = tourneys[0]
      ? await fetchTourney({ data: { id: tourneys[0].id } })
      : null;
    const geoJson = {
      ...ukRegionsRaw,
      features: (ukRegionsRaw as any).features.map(rewindFeature),
    };
    const latestRegions = regionsOverTime.at(-1)?.regions ?? [];

    const teamImageMap = new Map(teams.map((t) => [t.id, t.image_key]));
    const teamRankingsWithImages = (teamRankings as any[]).map((tr: any) => ({
      ...tr,
      image_key: teamImageMap.get(tr.team_id) ?? null,
    }));

    return {
      rankings,
      teamRankings: teamRankingsWithImages,
      factionRankings,
      painting,
      communityStats,
      latestRegions,
      geoJson,
      latestTourney,
    };
  },
  head: () =>
    seo({
      title: SITE_NAME,
      description:
        "The UK Malifaux Community. Events, Results, Rankings, Best Painted Models for the Malifaux miniatures game from Wyrd.",
      path: "/",
    }),
  component: HomePage,
});

function HomePage() {
  const {
    rankings,
    teamRankings,
    factionRankings,
    painting,
    communityStats,
    latestRegions,
    geoJson,
    latestTourney,
  } = Route.useLoaderData();

  const recentEvent = latestTourney
    ? {
        id: (latestTourney.tourney as any).id,
        name: (latestTourney.tourney as any).name,
        date: (latestTourney.tourney as any).date,
        venue: (latestTourney.tourney as any).venue,
        players: (latestTourney.players as any[]).map((p: any) => ({
          place: p.place,
          playerId: p.playerId,
          playerName: p.playerName,
          points: p.points,
          factionName: p.factionName,
        })),
      }
    : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <TopPlayersCard data={rankings as any} />
      <PaintingHighlightCard data={painting} />
      <TeamStandingsCard data={teamRankings as any} />
      <RegionsMapCard regions={latestRegions} geoJson={geoJson as any} />
      <RecentEventCard data={recentEvent} />
      <CommunityStatsCard data={communityStats} />
      <FactionCard data={factionRankings as any} />
    </div>
  );
}
