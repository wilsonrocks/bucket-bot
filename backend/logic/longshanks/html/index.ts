import { readFileSync } from "fs";
import { join } from "path";

export const powderMonkeyFaux3PlayersHtml = readFileSync(
  join(__dirname, "./powder-monkey-faux-3-players.html")
).toString();

export const newFrontierPlayersHtml = readFileSync(
  join(__dirname, "./new-frontier-players.html")
).toString();

export const ozMagicalMysteryTourPlayersHtml = readFileSync(
  join(__dirname, "./oz-magical-mystery-tour-players.html")
).toString();
