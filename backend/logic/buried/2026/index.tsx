import crypto from "crypto";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { renderPng, toDataUri } from "../render";
import type { BuriedEdition, GeneratedDeck } from "../types";
import { buildAllDecks } from "./build-cards";
import { cardSchema, type Card } from "./cards";
import { fetchYearData } from "./queries";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  CardImage,
  OG_HEIGHT,
  OG_WIDTH,
  SummaryOgImage,
  type ImageContext,
} from "./images";

const hashOf = (png: Buffer) => crypto.createHash("sha256").update(png).digest("hex").slice(0, 12);

export const edition2026: BuriedEdition = {
  async generate(db: Kysely<DB>, opts): Promise<GeneratedDeck[]> {
    const { year, window, images } = opts;
    const data = await fetchYearData(db, window);
    const decks = buildAllDecks(data);

    let logo: string | undefined;
    if (images?.cardBackImageKey) {
      const buf = await images.loadAsset(`${images.cardBackImageKey}-w400.webp`);
      if (buf) logo = await toDataUri(buf, 192);
    }

    const out: GeneratedDeck[] = [];
    for (const player of data.players) {
      const built = decks.get(player.id) ?? [];
      let summaryImageKey: string | null = null;
      const cards: Card[] = [];

      for (const card of built) {
        if (!images) {
          cards.push(card);
          continue;
        }
        const ctx: ImageContext = { year, playerName: player.name, ...(logo ? { logo } : {}) };
        if (card.key === "PAINTING" || card.key === "PAINTING_AWARD") {
          const photoKey =
            card.key === "PAINTING_AWARD"
              ? card.award.paintingImageKey
              : card.awards.find((a) => a.paintingImageKey)?.paintingImageKey;
          const buf = photoKey ? await images.loadAsset(`${photoKey}-w800.webp`) : null;
          if (buf) ctx.paintingPhoto = await toDataUri(buf, 880);
        }
        const png = await renderPng(<CardImage card={card} ctx={ctx} />, CARD_WIDTH, CARD_HEIGHT);
        const imageKey = `buried/${year}/${player.id}/${hashOf(png)}-${card.key}.png`;
        await images.storeAsset(imageKey, png);
        cards.push({ ...card, imageKey });

        if (card.key === "SUMMARY") {
          const og = await renderPng(<SummaryOgImage card={card} ctx={ctx} />, OG_WIDTH, OG_HEIGHT);
          summaryImageKey = `buried/${year}/${player.id}/${hashOf(og)}-og.png`;
          await images.storeAsset(summaryImageKey, og);
        }
      }

      // Belt and braces: never persist a card the site's guards would reject.
      out.push({
        playerId: player.id,
        cards: cards.filter((c) => cardSchema.safeParse(c).success),
        summaryImageKey,
      });
    }
    return out;
  },
};
