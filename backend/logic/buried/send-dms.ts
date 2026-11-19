import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { getDiscordClient } from "../discord-client";
import { getSiteUrl } from "../site-url";

export const buriedUrl = (playerId: number, year: number) => `${getSiteUrl()}/player/${playerId}/buried/${year}`;

export function buriedDmMessage(playerId: number, year: number): string {
  return [
    `🪦 **Your Malifaux Buried ${year} is ready.**`,
    `Your year at the table — every event, faction, podium and painting award — shuffled into a deck of cards. Flip through, then share your favourites.`,
    buriedUrl(playerId, year),
  ].join("\n\n");
}

export interface DmResult {
  sent: number;
  failed: number;
  /** Players with a deck but no linked Discord account. */
  skipped: number;
}

/**
 * DMs every player with a deck their link, once: players already DMed
 * (dm_sent_at set) are left alone, so a failed run can just be re-run. Never
 * throws for a single user — DMs closed is logged and counted.
 */
export async function sendBuriedDms(db: Kysely<DB>, year: number): Promise<DmResult> {
  const rows = await db
    .selectFrom("buried_player")
    .innerJoin("player", "player.id", "buried_player.player_id")
    .where("buried_player.year", "=", year)
    .where("buried_player.dm_sent_at", "is", null)
    .select(["player.id", "player.discord_id"])
    .orderBy("player.id")
    .execute();

  const skipped = rows.filter((r) => !r.discord_id).length;
  const targets = rows.filter((r): r is { id: number; discord_id: string } => !!r.discord_id);
  if (targets.length === 0) return { sent: 0, failed: 0, skipped };

  const discordClient = await getDiscordClient();
  let sent = 0;
  let failed = 0;
  for (const { id, discord_id } of targets) {
    try {
      const user = await discordClient.users.fetch(discord_id);
      await user.send(buriedDmMessage(id, year));
    } catch (err) {
      failed += 1;
      console.error(`Failed to DM Buried ${year} to player ${id}:`, err);
      continue;
    }
    await db
      .updateTable("buried_player")
      .set({ dm_sent_at: new Date() })
      .where("player_id", "=", id)
      .where("year", "=", year)
      .execute();
    sent += 1;
  }
  return { sent, failed, skipped };
}

/** Sends the caller their own link (or a note that they have no deck), without marking anything sent. */
export async function sendBuriedTestDm(db: Kysely<DB>, year: number, discordUserId: string): Promise<{ playerId: number | null }> {
  const row = await db
    .selectFrom("buried_player")
    .innerJoin("player", "player.id", "buried_player.player_id")
    .where("buried_player.year", "=", year)
    .where("player.discord_id", "=", discordUserId)
    .select("player.id")
    .executeTakeFirst();

  const discordClient = await getDiscordClient();
  const user = await discordClient.users.fetch(discordUserId);
  await user.send(
    row
      ? `-# Test DM — this is what players will get.\n\n${buriedDmMessage(row.id, year)}`
      : `-# Test DM — you don't have a Buried ${year} deck (no linked player with results or events organised), so here's the shape only.\n\n${buriedDmMessage(0, year)}`,
  );
  return { playerId: row?.id ?? null };
}
