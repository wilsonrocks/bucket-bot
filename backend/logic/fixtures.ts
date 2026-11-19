export enum Faction {
  RESSERS = "RESSERS",
  GUILD = "GUILD",
  ARCANISTS = "ARCANISTS",
  OUTCASTS = "OUTCASTS",
  THUNDERS = "THUNDERS",
  NEVERBORN = "NEVERBORN",
  BAYOU = "BAYOU",
  EXPLORER = "EXPLORER",
}

export enum RankingType {
  BEST_FOREVER = "BEST_FOREVER", // should not be generated any more
  ROLLING_YEAR = "ROLLING_YEAR",
  MASTERS = "MASTERS",
  BEST_RESSER = "BEST_RESSER",
  BEST_GUILD = "BEST_GUILD",
  BEST_ARCANIST = "BEST_ARCANIST",
  BEST_OUTCAST = "BEST_OUTCAST",
  BEST_THUNDER = "BEST_THUNDERS",
  BEST_NEVERBORN = "BEST_NEVERBORN",
  BEST_BAYOU = "BEST_BAYOU",
  BEST_EXPLORER = "BEST_EXPLORERS",
}

export enum IdentityProvider {
  LONGSHANKS = "LONGSHANKS",
  BOT = "BOT", // legacy Bag o Tools, keyed by player name — no longer imported
  BOT4 = "BOT4",
}

/** The per-faction "Best X" ranking each faction's players are ranked in. */
export const FACTION_RANKING_TYPE: Record<Faction, RankingType> = {
  [Faction.RESSERS]: RankingType.BEST_RESSER,
  [Faction.GUILD]: RankingType.BEST_GUILD,
  [Faction.ARCANISTS]: RankingType.BEST_ARCANIST,
  [Faction.OUTCASTS]: RankingType.BEST_OUTCAST,
  [Faction.THUNDERS]: RankingType.BEST_THUNDER,
  [Faction.NEVERBORN]: RankingType.BEST_NEVERBORN,
  [Faction.BAYOU]: RankingType.BEST_BAYOU,
  [Faction.EXPLORER]: RankingType.BEST_EXPLORER,
};
