import { createServerFn } from '@tanstack/react-start'
import { sql } from 'kysely'
import { formatISO } from 'date-fns'
import { db } from './db-client'

// ── Rankings ───────────────────────────────────────────────────────────────

export const fetchRankingTypes = createServerFn().handler(async () => {
  return db
    .selectFrom('ranking_snapshot_type')
    .where('display', '=', true)
    .select(['code', 'name', 'description'])
    .orderBy('display_order')
    .execute()
})

export const fetchRankings = createServerFn()
  .inputValidator((d: { typeCode: string }) => d)
  .handler(async ({ data: { typeCode } }) => {
    const snapshot = await db
      .selectFrom('ranking_snapshot_batch')
      .selectAll()
      .where('type_code', '=', typeCode)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirstOrThrow()

    return db
      .selectFrom('ranking_snapshot')
      .innerJoin('player', 'ranking_snapshot.player_id', 'player.id')
      .innerJoin('ranking_snapshot_batch', 'ranking_snapshot.batch_id', 'ranking_snapshot_batch.id')
      .leftJoin('membership as current_m', (join) =>
        join.onRef('current_m.player_id', '=', 'player.id').on('current_m.left_date', 'is', null),
      )
      .leftJoin('team as current_team', 'current_team.id', 'current_m.team_id')
      .where('batch_id', '=', snapshot.id)
      .where('type_code', '=', typeCode)
      .select([
        'ranking_snapshot.rank',
        'ranking_snapshot.total_points',
        'ranking_snapshot.player_id',
        'ranking_snapshot.batch_id',
        'ranking_snapshot_batch.type_code',
        'player.id',
        'player.name',
        'player.short_name',
        'ranking_snapshot.rank_change',
        'ranking_snapshot.new_player',
        'current_team.id as current_team_id',
        'current_team.name as current_team_name',
        'current_team.image_key as team_image_key',
      ])
      .orderBy('ranking_snapshot.rank', 'asc')
      .execute()
  })

export const fetchPlayersOverTime = createServerFn()
  .inputValidator((d: { typeCode: string }) => d)
  .handler(async ({ data: { typeCode } }) => {
    const playerData = await db
      .selectFrom('ranking_snapshot')
      .innerJoin('ranking_snapshot_batch', 'ranking_snapshot.batch_id', 'ranking_snapshot_batch.id')
      .innerJoin('player', 'ranking_snapshot.player_id', 'player.id')
      .where('ranking_snapshot_batch.type_code', '=', typeCode)
      .where('ranking_snapshot.rank', '<=', 16)
      .select([
        'ranking_snapshot.player_id',
        'ranking_snapshot.batch_id',
        'ranking_snapshot.rank',
        'ranking_snapshot.total_points',
        'ranking_snapshot_batch.created_at as snapshot_date',
        'player.name',
        'player.short_name',
      ])
      .execute()

    const batchIds = [...new Set(playerData.map((r) => r.batch_id))]
    if (batchIds.length === 0) return []

    const factionData = await db
      .selectFrom('ranking_snapshot_event')
      .innerJoin('player_identity', 'player_identity.player_id', 'ranking_snapshot_event.player_id')
      .innerJoin('result', (join) =>
        join
          .onRef('result.player_identity_id', '=', 'player_identity.id')
          .onRef('result.tourney_id', '=', 'ranking_snapshot_event.tourney_id'),
      )
      .innerJoin('faction', 'result.faction_code', 'faction.name_code')
      .where('ranking_snapshot_event.batch_id', 'in', batchIds)
      .where('ranking_snapshot_event.player_id', 'in', [...new Set(playerData.map((r) => r.player_id!))])
      .select([
        'ranking_snapshot_event.batch_id',
        'ranking_snapshot_event.player_id',
        'faction.hex_code',
        'faction.name_code as faction_code',
      ])
      .execute()

    const factionMap = new Map<string, typeof factionData>()
    for (const row of factionData) {
      const key = `${row.batch_id}:${row.player_id}`
      const existing = factionMap.get(key) ?? []
      existing.push(row)
      factionMap.set(key, existing)
    }

    const grouped = new Map<string, { date: string; players: typeof playerData }>()
    for (const row of playerData) {
      const dateKey = row.snapshot_date.toISOString()
      const existing = grouped.get(dateKey) ?? { date: dateKey, players: [] }
      existing.players.push(row)
      grouped.set(dateKey, existing)
    }

    return [...grouped.values()].map((g) => ({
      date: g.date,
      players: g.players.map((p) => ({
        player_id: p.player_id!,
        name: p.name,
        short_name: p.short_name,
        rank: p.rank!,
        total_points: p.total_points!,
        factions: factionMap.get(`${p.batch_id}:${p.player_id}`) ?? [],
      })),
    }))
  })

// ── Player rankings over time ──────────────────────────────────────────────

export const fetchPlayerRankingHistory = createServerFn()
  .inputValidator((d: { playerId: number; typeCode: string }) => d)
  .handler(async ({ data: { playerId, typeCode } }) => {
    const [metadata, rankings] = await Promise.all([
      db
        .selectFrom('ranking_snapshot')
        .innerJoin('ranking_snapshot_batch', 'ranking_snapshot.batch_id', 'ranking_snapshot_batch.id')
        .where('type_code', '=', typeCode)
        .select(({ fn }) => fn.max<number>('ranking_snapshot.rank').as('number_of_players'))
        .executeTakeFirstOrThrow(),
      db
        .selectFrom('ranking_snapshot')
        .where('player_id', '=', playerId)
        .innerJoin('player', 'ranking_snapshot.player_id', 'player.id')
        .innerJoin('ranking_snapshot_batch', 'ranking_snapshot.batch_id', 'ranking_snapshot_batch.id')
        .where('ranking_snapshot_batch.type_code', '=', typeCode)
        .select([
          'ranking_snapshot.batch_id',
          'ranking_snapshot_batch.created_at',
          'ranking_snapshot.rank',
          'ranking_snapshot.total_points',
          'player.name',
        ])
        .execute(),
    ])
    return { metadata, rankings }
  })

// ── Players ────────────────────────────────────────────────────────────────

export const fetchPlayers = createServerFn().handler(async () => {
  return db
    .selectFrom('player')
    .leftJoin('discord_user', 'discord_user.discord_user_id', 'player.discord_id')
    .leftJoin('membership as current_m', (join) =>
      join.onRef('current_m.player_id', '=', 'player.id').on('current_m.left_date', 'is', null),
    )
    .leftJoin('team as current_team', 'current_team.id', 'current_m.team_id')
    .select([
      'player.id',
      'player.name',
      'player.short_name',
      'current_team.name as current_team_name',
      'current_team.id as current_team_id',
      (eb) =>
        eb
          .selectFrom('result')
          .innerJoin('player_identity', 'player_identity.id', 'result.player_identity_id')
          .whereRef('player_identity.player_id', '=', 'player.id')
          .select((eb2) => eb2.fn.countAll<number>().as('count'))
          .as('event_count'),
    ])
    .orderBy('player.name')
    .execute()
})

export const fetchPlayer = createServerFn()
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data: { id } }) => {
    return db
      .selectFrom('player')
      .leftJoin('discord_user', 'discord_user.discord_user_id', 'player.discord_id')
      .select([
        'player.id',
        'player.name',
        'player.short_name',
        'player.discord_id',
        'player.longshanks_name',
        'player.created_at',
        'discord_user.discord_username',
        'discord_user.discord_display_name',
        'discord_user.discord_avatar_url',
      ])
      .where('player.id', '=', id)
      .executeTakeFirst()
  })

export const fetchPlayerTeams = createServerFn()
  .inputValidator((d: { playerId: number }) => d)
  .handler(async ({ data: { playerId } }) => {
    return db
      .selectFrom('membership')
      .innerJoin('team', 'team.id', 'membership.team_id')
      .select([
        'membership.id as membership_id',
        'team.id as team_id',
        'team.name as team_name',
        'membership.join_date',
        'membership.left_date',
        'membership.is_captain',
      ])
      .where('membership.player_id', '=', playerId)
      .orderBy('membership.join_date', 'desc')
      .execute()
  })

export const fetchPlayerTourneys = createServerFn()
  .inputValidator((d: { playerId: number }) => d)
  .handler(async ({ data: { playerId } }) => {
    return db
      .selectFrom('result')
      .innerJoin('tourney', 'result.tourney_id', 'tourney.id')
      .innerJoin('faction', 'result.faction_code', 'faction.name_code')
      .innerJoin('player_identity', 'result.player_identity_id', 'player_identity.id')
      .innerJoin('player', 'player_identity.player_id', 'player.id')
      .where('player_identity.player_id', '=', playerId)
      .select([
        'tourney.id as tourneyId',
        'tourney.name as tourneyName',
        'tourney.date',
        'result.place',
        'result.points',
        'faction.name as factionName',
      ])
      .orderBy('tourney.date', 'desc')
      .execute()
  })

export const fetchPlayerPaintingWins = createServerFn()
  .inputValidator((d: { playerId: number }) => d)
  .handler(async ({ data: { playerId } }) => {
    const wins = await db
      .selectFrom('painting_winner')
      .innerJoin('painting_category', 'painting_winner.category_id' as any, 'painting_category.id')
      .innerJoin('tourney', 'painting_category.tourney_id', 'tourney.id')
      .innerJoin('player_identity', 'painting_winner.player_identity_id' as any, 'player_identity.id')
      .where('player_identity.player_id', '=', playerId)
      .select([
        'painting_winner.id as id',
        'tourney.id as tourneyId',
        'tourney.name as tourneyName',
        'tourney.date as tourneyDate',
        'painting_category.id as categoryId',
        'painting_category.name as categoryName',
        'painting_winner.position',
        'painting_winner.model',
        'painting_winner.image_key as imageKey' as any,
        'painting_winner.description' as any,
      ])
      .orderBy('tourney.date', 'desc')
      .orderBy('painting_winner.position', 'asc')
      .execute() as any[]

    if (wins.length === 0) return []

    const categoryIds = [...new Set(wins.map((w) => w.categoryId))]
    const totals = await db
      .selectFrom('painting_winner')
      .where('painting_winner.category_id' as any, 'in', categoryIds)
      .select([
        'painting_winner.category_id as categoryId' as any,
        sql<number>`count(*)::int`.as('totalWinners'),
      ])
      .groupBy('painting_winner.category_id' as any)
      .execute() as any[]

    const totalsByCat = new Map<number, number>(totals.map((t) => [t.categoryId, t.totalWinners]))
    return wins.map((w) => ({ ...w, totalWinners: totalsByCat.get(w.categoryId) ?? 1 }))
  })

// ── Events ─────────────────────────────────────────────────────────────────

export const fetchTourneys = createServerFn().handler(async () => {
  const results = await db
    .selectFrom('tourney')
    .innerJoin('result', 'tourney.id', 'result.tourney_id')
    .select([
      'tourney.id',
      'tourney.name',
      'tourney.date',
      'tourney.venue',
      'tourney.tier_code',
      db.fn.count('result.id').as('players'),
    ])
    .groupBy(['tourney.id'])
    .orderBy('tourney.date', 'desc')
    .execute()
  return results.map((e) => ({ ...e, players: parseInt(e.players as string) }))
})

export const fetchTiers = createServerFn().handler(async () => {
  return db.selectFrom('tier').selectAll().execute()
})

export const fetchTourney = createServerFn()
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data: { id } }) => {
    const [players, tourney, paintingCategoryRows] = await Promise.all([
      db
        .selectFrom('tourney')
        .innerJoin('result', 'tourney.id', 'result.tourney_id')
        .innerJoin('player_identity', 'player_identity.id', 'result.player_identity_id')
        .leftJoin('player', 'player_identity.player_id', 'player.id')
        .innerJoin('faction', 'result.faction_code', 'faction.name_code')
        .where('tourney.id', '=', id)
        .select([
          'player.id as playerId',
          'player_identity.id as playerIdentityId',
          'faction.name as factionName',
          sql<string>`coalesce(${sql.ref('player.name')}, ${sql.ref('player_identity.provider_name')})`.as('playerName'),
          'result.place',
          'result.points',
          'faction.hex_code as factionHexCode',
        ])
        .orderBy('result.place', 'asc')
        .execute(),
      db.selectFrom('tourney').where('tourney.id', '=', id).selectAll().executeTakeFirstOrThrow(),
      db
        .selectFrom('painting_category')
        .leftJoin('painting_winner', 'painting_category.id', 'painting_winner.category_id')
        .leftJoin('player_identity', 'painting_winner.player_identity_id' as any, 'player_identity.id')
        .leftJoin('player', 'player_identity.player_id', 'player.id')
        .where('painting_category.tourney_id', '=', id)
        .select([
          'painting_category.id as categoryId',
          'painting_category.name as categoryName',
          'painting_winner.id as winnerId',
          'painting_winner.player_identity_id as playerIdentityId' as any,
          sql<string>`coalesce(${sql.ref('player.name')}, ${sql.ref('player_identity.provider_name')})`.as('playerName'),
          'player.id as playerId',
          'painting_winner.position',
          'painting_winner.model',
          'painting_winner.image_key as imageKey' as any,
          'painting_winner.description as winnerDescription' as any,
        ])
        .orderBy('painting_category.id')
        .orderBy('painting_winner.position')
        .execute() as unknown as any[],
    ])

    const paintingCategories = (paintingCategoryRows as any[]).reduce((acc: any[], row: any) => {
      let cat = acc.find((c: any) => c.id === row.categoryId)
      if (!cat) {
        cat = { id: row.categoryId, name: row.categoryName, winners: [] }
        acc.push(cat)
      }
      if (row.winnerId !== null) {
        cat.winners.push({
          id: row.winnerId,
          playerIdentityId: row.playerIdentityId,
          playerName: row.playerName,
          playerId: row.playerId,
          position: row.position,
          model: row.model,
          imageKey: row.imageKey,
          description: row.winnerDescription,
        })
      }
      return acc
    }, [])

    return { players, tourney, paintingCategories }
  })

// ── Teams ──────────────────────────────────────────────────────────────────

export const fetchTeams = createServerFn().handler(async () => {
  return db.selectFrom('team').selectAll().orderBy('name').execute()
})

export const fetchTeam = createServerFn()
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data: { id } }) => {
    const team = await db.selectFrom('team').selectAll().where('id', '=', id).executeTakeFirst()
    if (!team) return null

    const latestBatch = await db
      .selectFrom('ranking_snapshot_batch')
      .select('id')
      .where('type_code', '=', 'ROLLING_YEAR')
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    const members = await db
      .selectFrom('membership')
      .innerJoin('player', 'player.id', 'membership.player_id')
      .leftJoin('ranking_snapshot', (join) =>
        join
          .onRef('ranking_snapshot.player_id', '=', 'player.id')
          .on('ranking_snapshot.batch_id', '=', latestBatch?.id ?? 0),
      )
      .select([
        'membership.id as membership_id',
        'membership.player_id',
        'player.name as player_name',
        'membership.is_captain',
        'ranking_snapshot.total_points as rolling_year_points',
        'ranking_snapshot.rank as rolling_year_rank',
      ])
      .where('membership.team_id', '=', id)
      .where('membership.left_date', 'is', null)
      .orderBy(sql`ranking_snapshot.total_points desc nulls last`)
      .execute()

    return { ...team, members }
  })

export const fetchTeamRankings = createServerFn()
  .inputValidator((d: { typeCode: string }) => d)
  .handler(async ({ data: { typeCode } }) => {
    const batch = await db
      .selectFrom('team_ranking_snapshot_batch')
      .selectAll()
      .where('type_code', '=', typeCode)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (!batch) return []

    return db
      .selectFrom('team_ranking_snapshot')
      .innerJoin('team', 'team_ranking_snapshot.team_id', 'team.id')
      .where('batch_id', '=', batch.id)
      .select([
        'team_ranking_snapshot.batch_id',
        'team_ranking_snapshot.team_id',
        'team.name as team_name',
        'team.image_key',
        'team_ranking_snapshot.rank',
        'team_ranking_snapshot.total_points',
        'team_ranking_snapshot.rank_change',
        'team_ranking_snapshot.new_team',
        'team_ranking_snapshot.player_count',
        'team_ranking_snapshot.event_count',
      ])
      .orderBy('rank', 'asc')
      .execute()
  })

export const fetchTeamsOverTime = createServerFn()
  .inputValidator((d: { typeCode: string }) => d)
  .handler(async ({ data: { typeCode } }) => {
    const rows = await db
      .selectFrom('team_ranking_snapshot')
      .innerJoin('team_ranking_snapshot_batch', 'team_ranking_snapshot.batch_id', 'team_ranking_snapshot_batch.id')
      .innerJoin('team', 'team_ranking_snapshot.team_id', 'team.id')
      .where('team_ranking_snapshot_batch.type_code', '=', typeCode)
      .where('team_ranking_snapshot.rank', '<=', 16)
      .select([
        'team_ranking_snapshot.batch_id',
        'team_ranking_snapshot.team_id',
        'team_ranking_snapshot.rank',
        'team_ranking_snapshot.total_points',
        'team_ranking_snapshot_batch.created_at as snapshot_date',
        'team.name as team_name',
        'team.brand_colour',
      ])
      .orderBy('team_ranking_snapshot_batch.created_at', 'asc')
      .execute()

    const grouped = new Map<string, { date: string; teams: typeof rows }>()
    for (const row of rows) {
      const key = row.snapshot_date.toISOString()
      const existing = grouped.get(key) ?? { date: key, teams: [] }
      existing.teams.push(row)
      grouped.set(key, existing)
    }
    return [...grouped.values()].map((g) => ({
      date: g.date,
      teams: g.teams.map((t) => ({
        team_id: t.team_id,
        team_name: t.team_name,
        total_points: t.total_points!,
        rank: t.rank!,
        brand_colour: t.brand_colour,
      })),
    }))
  })

// ── Faction rankings ───────────────────────────────────────────────────────

export const fetchFactionRankings = createServerFn().handler(async () => {
  const newestBatch = await db
    .selectFrom('faction_snapshot_batch')
    .select('id')
    .orderBy('created_at', 'desc')
    .limit(1)
    .executeTakeFirst()

  if (!newestBatch) return []

  return db
    .selectFrom('faction_snapshot')
    .innerJoin('faction_snapshot_batch', 'faction_snapshot.batch_id', 'faction_snapshot_batch.id')
    .innerJoin('faction', 'faction_snapshot.faction_code', 'faction.name_code')
    .select([
      'faction_snapshot_batch.created_at as snapshot_date',
      'faction.name as faction_name',
      'faction_snapshot.rank as rank',
      'faction.name_code as faction_code',
      'faction_snapshot.total_points as total_points',
      'faction_snapshot.declarations as declarations',
      'faction_snapshot.declaration_rate as declaration_rate',
      'faction_snapshot.points_per_declaration as points_per_declaration',
      'faction.hex_code as hex_code',
      'faction_snapshot.rank_change as rank_change',
    ])
    .where('faction_snapshot.batch_id', '=', newestBatch.id)
    .orderBy('rank')
    .execute()
})

export const fetchFactionsOverTime = createServerFn().handler(async () => {
  const rows = await db
    .selectFrom('faction_snapshot')
    .innerJoin('faction_snapshot_batch', 'faction_snapshot.batch_id', 'faction_snapshot_batch.id')
    .innerJoin('faction', 'faction_snapshot.faction_code', 'faction.name_code')
    .select([
      'faction_snapshot.faction_code',
      'faction_snapshot.declarations',
      'faction_snapshot.points_per_declaration',
      'faction_snapshot.total_points',
      'faction_snapshot_batch.created_at as snapshot_date',
      'faction.name',
      'faction.short_name',
      'faction.hex_code',
    ])
    .execute()

  const grouped = new Map<string, { date: string; factions: typeof rows }>()
  for (const row of rows) {
    const key = row.snapshot_date.toISOString()
    const existing = grouped.get(key) ?? { date: key, factions: [] }
    existing.factions.push(row)
    grouped.set(key, existing)
  }
  return [...grouped.values()].map((g) => ({
    date: g.date,
    factions: g.factions.map((f) => ({
      faction_code: f.faction_code,
      declarations: f.declarations,
      points_per_declaration: f.points_per_declaration,
      total_points: f.total_points,
      name: f.name,
      hex_code: f.hex_code,
      short_name: f.short_name,
    })),
  }))
})

// ── Regions ────────────────────────────────────────────────────────────────

export const fetchRegionsOverTime = createServerFn().handler(async () => {
  const rows = await db
    .selectFrom('region_snapshot')
    .innerJoin('region_snapshot_batch', 'region_snapshot.batch_id', 'region_snapshot_batch.id')
    .innerJoin('region', 'region_snapshot.region_id', 'region.id')
    .select([
      'region_snapshot.batch_id',
      'region_snapshot.region_id',
      'region_snapshot.event_count',
      'region_snapshot_batch.created_at as snapshot_date',
      'region.geojson_name',
    ])
    .orderBy('region_snapshot_batch.created_at', 'asc')
    .execute()

  const groupedByDate = rows.reduce(
    (acc, row) => {
      const dateKey = formatISO(row.snapshot_date, { representation: 'date' })
      if (!acc[dateKey]) acc[dateKey] = { dateKey, batchId: row.batch_id, regions: [] }
      if (row.batch_id >= acc[dateKey].batchId) {
        acc[dateKey] = {
          dateKey,
          batchId: row.batch_id,
          regions: row.batch_id > acc[dateKey].batchId ? [] : acc[dateKey].regions,
        }
      }
      acc[dateKey].regions.push({
        region_id: row.region_id,
        geojson_name: row.geojson_name,
        event_count: row.event_count,
      })
      return acc
    },
    {} as Record<string, { dateKey: string; batchId: number; regions: { region_id: number; geojson_name: string; event_count: number }[] }>,
  )

  return Object.values(groupedByDate).map((g) => ({
    date: g.dateKey,
    regions: g.regions,
  }))
})

// ── Painting ───────────────────────────────────────────────────────────────

export const fetchAllPainting = createServerFn().handler(async () => {
  const rows = await db
    .selectFrom('painting_winner')
    .innerJoin('painting_category', 'painting_winner.category_id' as any, 'painting_category.id')
    .innerJoin('tourney', 'painting_category.tourney_id', 'tourney.id')
    .innerJoin('player_identity', 'painting_winner.player_identity_id' as any, 'player_identity.id')
    .leftJoin('player', 'player_identity.player_id', 'player.id')
    .select([
      'painting_winner.id as id',
      'player.id as playerId',
      sql<string>`coalesce(${sql.ref('player.name')}, ${sql.ref('player_identity.provider_name')})`.as('playerName'),
      'tourney.id as tourneyId',
      'tourney.name as tourneyName',
      sql<string>`${sql.ref('tourney.date')}::text`.as('tourneyDate'),
      'painting_category.id as categoryId',
      'painting_category.name as categoryName',
      'painting_winner.image_key as imageKey' as any,
      'painting_winner.model as model',
      'painting_winner.description' as any,
      'painting_winner.position',
      sql<number>`count(*) over (partition by ${sql.ref('painting_winner.category_id')})::int`.as('totalWinners'),
    ])
    .orderBy('tourney.date', 'desc')
    .orderBy('painting_category.id', 'asc')
    .orderBy('painting_winner.position', 'asc')
    .execute() as any[]

  return rows.map((r) => ({
    id: r.id,
    playerId: r.playerId ?? null,
    playerName: r.playerName,
    tourneyId: r.tourneyId,
    tourneyName: r.tourneyName,
    tourneyDate: r.tourneyDate,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    imageKey: r.imageKey ?? null,
    model: r.model ?? null,
    description: r.description ?? null,
    position: r.position,
    totalWinners: r.totalWinners,
  }))
})

export const fetchRecentPainting = createServerFn().handler(async () => {
  const row = await db
    .selectFrom('painting_winner')
    .innerJoin('painting_category', 'painting_winner.category_id', 'painting_category.id')
    .innerJoin('tourney', 'painting_category.tourney_id', 'tourney.id')
    .innerJoin('player_identity', 'painting_winner.player_identity_id' as any, 'player_identity.id')
    .leftJoin('player', 'player_identity.player_id', 'player.id')
    .where('painting_winner.position', '=', 1)
    .orderBy('tourney.date', 'desc')
    .orderBy('painting_category.id', 'asc')
    .select([
      'player.id as playerId',
      sql<string>`coalesce(${sql.ref('player.name')}, ${sql.ref('player_identity.provider_name')})`.as('playerName'),
      'tourney.id as tourneyId',
      'tourney.name as tourneyName',
      'painting_category.name as categoryName',
      'painting_winner.image_key as imageKey' as any,
      'painting_winner.model as model',
    ])
    .limit(1)
    .executeTakeFirst() as any

  if (!row) return null
  return {
    playerId: row.playerId ?? null,
    playerName: row.playerName,
    tourneyId: row.tourneyId,
    tourneyName: row.tourneyName,
    categoryName: row.categoryName,
    imageKey: row.imageKey ?? null,
    model: row.model ?? null,
  }
})

// ── Community stats ────────────────────────────────────────────────────────

export const fetchCommunityStats = createServerFn().handler(async () => {
  const row = await db
    .selectFrom('result')
    .innerJoin('player_identity', 'result.player_identity_id', 'player_identity.id')
    .select((eb) => [
      eb.fn.sum('rounds_played').as('games_played'),
      sql`COUNT(DISTINCT tourney_id)`.as('total_events'),
      sql`COUNT(DISTINCT player_identity.player_id)`.as('total_players'),
    ])
    .executeTakeFirstOrThrow()

  return {
    totalPlayers: Number(row.total_players),
    gamesPlayed: Number(row.games_played),
    totalEvents: Number(row.total_events),
  }
})
