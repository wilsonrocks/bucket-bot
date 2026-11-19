import { sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { getAsset, putAsset } from "../assets-s3";
import { edition2026 } from "./2026";
import type { BuriedEdition, BuriedImageIO, BuriedWindow } from "./types";

/** Every year with a generator. A year without an entry can't be generated. */
export const EDITIONS: Record<number, BuriedEdition> = {
  2026: edition2026,
};

/** S3-backed image IO; keys are relative to the `media/` prefix VITE_ASSETS_URL points at. */
export const s3ImageIO = (cardBackImageKey: string | null): BuriedImageIO => ({
  cardBackImageKey,
  loadAsset: (key) => getAsset(`media/${key}`),
  storeAsset: (key, png) => putAsset(`media/${key}`, png, "image/png"),
});

export interface GenerateResult {
  players: number;
  cards: number;
  removed: number;
}

/**
 * Regenerates every player's deck for a year and upserts it. Re-running is
 * safe: it keeps dm_sent_at, and removes decks for players who no longer
 * qualify (e.g. after a result was moved to another identity).
 */
export async function generateBuried(
  db: Kysely<DB>,
  year: number,
  opts: { images?: (cardBackImageKey: string | null) => BuriedImageIO; window?: BuriedWindow } = {},
): Promise<GenerateResult> {
  const edition = EDITIONS[year];
  if (!edition) throw new Error(`No Buried generator for ${year}`);

  const row = await db
    .selectFrom("buried_year")
    .where("year", "=", year)
    .select([sql<string>`to_char(cutoff_date, 'YYYY-MM-DD')`.as("cutoff"), "card_back_image_key"])
    .executeTakeFirst();
  if (!row) throw new Error(`buried_year ${year} does not exist`);

  const window = opts.window ?? { start: `${year}-01-01`, end: row.cutoff };
  const images = opts.images?.(row.card_back_image_key);
  const decks = await edition.generate(db, { year, window, ...(images ? { images } : {}) });

  return db.transaction().execute(async (trx) => {
    if (decks.length > 0) {
      await trx
        .insertInto("buried_player")
        .values(
          decks.map((d) => ({
            player_id: d.playerId,
            year,
            cards: JSON.stringify(d.cards),
            summary_image_key: d.summaryImageKey,
          })),
        )
        .onConflict((oc) =>
          oc.columns(["player_id", "year"]).doUpdateSet((eb) => ({
            cards: eb.ref("excluded.cards"),
            summary_image_key: eb.ref("excluded.summary_image_key"),
            generated_at: sql<Date>`CURRENT_TIMESTAMP`,
          })),
        )
        .execute();
    }

    let removeQuery = trx.deleteFrom("buried_player").where("year", "=", year);
    if (decks.length > 0) {
      removeQuery = removeQuery.where("player_id", "not in", decks.map((d) => d.playerId));
    }
    const removed = await removeQuery.executeTakeFirst();

    return {
      players: decks.length,
      cards: decks.reduce((sum, d) => sum + d.cards.length, 0),
      removed: Number(removed.numDeletedRows),
    };
  });
}

/**
 * Generation renders ~10 images per player, which outlasts a proxied HTTP
 * request, so the admin route starts it in the background and polls. One
 * process runs the API, so in-memory state is enough.
 */
export type GenerationStatus =
  | { state: "idle" }
  | { state: "running"; startedAt: string }
  | { state: "done"; finishedAt: string; result: GenerateResult }
  | { state: "failed"; finishedAt: string; error: string };

const statuses = new Map<number, GenerationStatus>();

export const generationStatus = (year: number): GenerationStatus => statuses.get(year) ?? { state: "idle" };

/** Starts generation unless it's already running. Returns false if it was. */
export function startGeneration(year: number, run: () => Promise<GenerateResult>): boolean {
  if (generationStatus(year).state === "running") return false;
  statuses.set(year, { state: "running", startedAt: new Date().toISOString() });
  run().then(
    (result) => statuses.set(year, { state: "done", finishedAt: new Date().toISOString(), result }),
    (err: unknown) => {
      console.error(`Buried ${year} generation failed:`, err);
      statuses.set(year, {
        state: "failed",
        finishedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      });
    },
  );
  return true;
}
