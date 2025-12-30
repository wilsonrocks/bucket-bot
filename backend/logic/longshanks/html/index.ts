import { readFileSync } from "fs";
import { join } from "path";

export const powderMonkeyFaux3PlayersHtml = readFileSync(
  join(__dirname, "./powder-monkey-faux-3-players.html")
).toString();

export const powderMonkeyFaux3TourneyHtml = readFileSync(
  join(__dirname, "./powder-monkey-faux-3-tourney.html")
).toString();

export const newFrontierPlayersHtml = readFileSync(
  join(__dirname, "./new-frontier-players.html")
).toString();

export const newFrontierTourneyHtml = readFileSync(
  join(__dirname, "./new-frontier-tourney.html")
).toString();

export const ozMagicalMysteryTourPlayersHtml = readFileSync(
  join(__dirname, "./oz-magical-mystery-tour-players.html")
).toString();

export const ozMagicalMysteryTourTourneyHtml = readFileSync(
  join(__dirname, "./oz-magical-mystery-tour-tourney.html")
).toString();

export const wyrdLittleCacoonPlayersHtml = readFileSync(
  join(__dirname, "./wyrd-little-cacoon.html")
).toString();

export const malifauxYorkshireRumbleTourneyHtml = readFileSync(
  join(__dirname, "./malifaux-yorkshire-rumble-tourney.html")
).toString();
