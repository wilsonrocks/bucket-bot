import { Faction } from "../fixtures.js";

export function mapBotFactionToFactionCode(botFaction: string): Faction {
  switch (botFaction) {
    case "outcasts":
      return Faction.OUTCASTS;
    case "guild":
      return Faction.GUILD;
    case "bayou":
      return Faction.BAYOU;
    case "arcanists":
      return Faction.ARCANISTS;
    case "explorers society":
      return Faction.EXPLORER;
    case "neverborn":
      return Faction.NEVERBORN;
    case "ten thunders":
      return Faction.THUNDERS;
    case "resurrectionists":
      return Faction.RESSERS;
    default:
      throw new Error(`Unknown BOT faction: "${botFaction}"`);
  }
}
