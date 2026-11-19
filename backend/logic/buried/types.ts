import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";

/** Data window, both yyyy-MM-dd; `end` is exclusive (the cutoff). */
export interface BuriedWindow {
  start: string;
  end: string;
}

export interface BuriedImageIO {
  cardBackImageKey: string | null;
  /** Keys are relative to the assets `media/` prefix. */
  loadAsset: (key: string) => Promise<Buffer | null>;
  storeAsset: (key: string, png: Buffer) => Promise<void>;
}

export interface GeneratedDeck {
  playerId: number;
  cards: object[];
  summaryImageKey: string | null;
}

/**
 * One year's generator. Each year lives in its own folder so next year's
 * logic can diverge completely without touching a published edition.
 */
export interface BuriedEdition {
  generate(
    db: Kysely<DB>,
    opts: {
      year: number;
      window: BuriedWindow;
      /** Omit to skip rendering share images (tests, dry runs). */
      images?: BuriedImageIO;
    },
  ): Promise<GeneratedDeck[]>;
}
