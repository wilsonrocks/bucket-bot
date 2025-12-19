import { parseHTML } from "linkedom";

interface LongshanksTourneyData {
  longshanksId: string;
  location: string;
  name: string;
  date: string;
  tournamentOrganiserId: string | undefined;
}

export const extractTourneyFromLongshanksHtml = (
  htmlText: string
): LongshanksTourneyData => {
  const { document } = parseHTML(htmlText);

  if (!document) {
    throw new Error(`No document found when parsing from Longshanks HTML`);
  }

  const name = document.querySelector(".desktop")?.textContent?.trim();
  if (!name) {
    throw new Error(
      `No tournament name found when parsing from Longshanks HTML`
    );
  }

  const longshanksId = document
    .querySelector("title")
    ?.textContent?.match(/\d+/)?.[0];

  if (!longshanksId) {
    throw new Error(`No tournament ID found when parsing from Longshanks HTML`);
  }

  const tableCells = [...document.querySelectorAll(".details table td")];

  const location = tableCells.at(-7)?.textContent?.trim();
  if (!location) {
    throw new Error(
      `No tournament location found when parsing from Longshanks HTML`
    );
  }

  const date = tableCells.at(-5)?.textContent?.trim().split(" ")[0];
  if (!date) {
    throw new Error(
      `No tournament date found when parsing from Longshanks HTML`
    );
  }

  const toId = tableCells.at(-3)?.textContent.match(/\d+/)?.[0];

  if (!toId) {
    console.log(
      `No tournament organiser ID found when parsing from Longshanks HTML`
    );
  }

  return {
    longshanksId,
    location,
    name,
    date,
    tournamentOrganiserId: toId,
  };
};
