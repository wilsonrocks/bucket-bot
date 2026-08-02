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
  fetchUpcomingEvents,
} from "#/queries";
import { buildSrcSet } from "#/components/image";
import { CommunityStatsCard } from "#/components/home/community-stats-card";
import { FactionCard } from "#/components/home/faction-card";
import { PaintingHighlightCard } from "#/components/home/painting-highlight-card";
import { RecentEventCard } from "#/components/home/recent-event-card";
import { RegionsMapCard } from "#/components/home/regions-map-card";
import { TeamStandingsCard } from "#/components/home/team-standings-card";
import { TopPlayersCard } from "#/components/home/top-players-card";
import { UpcomingEventsCard } from "#/components/home/upcoming-events-card";

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
      upcomingEvents,
    ] = await Promise.all([
      fetchRankings({ data: { typeCode: "ROLLING_YEAR" } }),
      fetchTeamRankings({ data: { typeCode: "ROLLING_YEAR" } }),
      fetchTeams(),
      fetchFactionRankings(),
      fetchTourneys(),
      fetchRecentPainting(),
      fetchCommunityStats(),
      fetchRegionsOverTime(),
      fetchUpcomingEvents(),
    ]);

    const latestTourney = tourneys[0]
      ? await fetchTourney({ data: { id: tourneys[0].id } })
      : null;
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
      latestTourney,
      upcomingEvents,
    };
  },
  head: ({ loaderData }) => {
    const base = seo({
      title: SITE_NAME,
      description:
        "The UK Malifaux Community. Events, Results, Rankings, Best Painted Models for the Malifaux miniatures game from Wyrd.",
      path: "/",
    });
    // Preload the best-painted photo (the LCP element) so its fetch starts during
    // head parse rather than after React renders the body.
    const imageKey = loaderData?.painting?.imageKey;
    return {
      ...base,
      links: [
        ...base.links,
        ...(imageKey
          ? [
              {
                rel: "preload",
                as: "image",
                imageSrcSet: buildSrcSet(imageKey),
                imageSizes: "(min-width: 768px) 33vw, 100vw",
                fetchPriority: "high" as const,
              },
            ]
          : []),
      ],
    };
  },
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
    latestTourney,
    upcomingEvents,
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
      <RegionsMapCard regions={latestRegions} />
      <RecentEventCard data={recentEvent} />
      <UpcomingEventsCard data={upcomingEvents} />
      <CommunityStatsCard data={communityStats} />
      <FactionCard data={factionRankings as any} />
    </div>
  );
}
