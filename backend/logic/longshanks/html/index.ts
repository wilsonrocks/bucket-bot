import { readFileSync } from "fs";
import { join } from "path";

export const powderMonkeyFaux3PlayersHtml = readFileSync(
  join(__dirname, "./powder-monkey-faux-3-players.html")
).toString();
