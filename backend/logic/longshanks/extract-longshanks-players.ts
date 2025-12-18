import { parseHTML } from "linkedom";

interface LongshanksPlayerData {
  longshanksId: string;
  rank: number;
  name: string;
  faction: string;
  team: string | undefined;
  roundsPlayed: number;
}

export const extractPlayersFromLongshanksHTML = (
  htmlText: string
): LongshanksPlayerData[] => {
  let document;
  try {
    const parsed = parseHTML(htmlText);
    document = parsed.document;
  } catch (err) {
    const outputError = new Error(`Error parsing HTML from Longshanks`);
    outputError.cause = err;
    throw outputError;
  }

  if (!document) {
    throw new Error(`No document found when parsing from Longshanks HTML`);
  }

  const players = [
    ...document.querySelectorAll("[class=player], [class='player drop']"),
  ].map((el) => {
    const longshanksId = el.getAttribute("id")?.split("_")[1];

    if (typeof longshanksId !== "string") {
      throw new Error(
        `No Longshanks ID found for player when parsing from Longshanks HTML (longshanksId=${longshanksId})`
      );
    }

    const name = el.querySelector(".player_link")?.textContent?.trim();
    if (typeof name !== "string") {
      throw new Error(
        `No player name found when parsing from Longshanks HTML (name=${name})`
      );
    }
    const faction = el.querySelector(".factions img")?.getAttribute("title");

    if (typeof faction !== "string") {
      throw new Error(
        `No faction found for player when parsing from Longshanks HTML (faction=${faction})`
      );
    }

    const team = el.querySelectorAll(".player_link")[1]?.textContent?.trim();
    const roundsPlayed =
      parseInt(el?.querySelectorAll(".wins")?.[0]?.textContent || "0") +
      parseInt(el?.querySelectorAll(".loss")?.[0]?.textContent || "0") +
      parseInt(el?.querySelectorAll(".ties")?.[0]?.textContent || "0");

    if (isNaN(roundsPlayed) || typeof roundsPlayed !== "number") {
      throw new Error(
        `problem extracting rounds played from longshanks data (rounds=${roundsPlayed})`
      );
    }

    const player: LongshanksPlayerData = {
      longshanksId,
      rank: parseInt(el.querySelector(".rank")?.textContent?.trim() ?? ""),
      name,
      faction,
      team,
      roundsPlayed,
    };
    return player;
  });
  return players.filter((p) => p.roundsPlayed > 0); // in case anyone drops all games
};
