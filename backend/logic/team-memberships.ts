import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";

type AddMemberResult =
  | { type: "discord_user_not_found" }
  | { type: "conflict" }
  | { type: "success"; membership: { id: number; player_id: number | null; team_id: number | null; is_captain: boolean }; playerName: string };

const FOUNDING_MEMBER_JOIN_DATE = "2025-12-01";

export type RemoveMemberMode = "leave" | "mistake";

/**
 * "leave" — the player is leaving the team now, so their past results stay
 * attributed to the team. "mistake" — they should never have been in the team,
 * so the membership is erased and none of their results count for it.
 */
export async function removeTeamMember(
  db: Kysely<DB>,
  teamId: number,
  membershipId: number,
  mode: RemoveMemberMode,
): Promise<boolean> {
  if (mode === "mistake") {
    const result = await db
      .deleteFrom("membership")
      .where("id", "=", membershipId)
      .where("team_id", "=", teamId)
      .executeTakeFirst();

    return result.numDeletedRows > 0n;
  }

  const result = await db
    .updateTable("membership")
    .set({ left_date: new Date() })
    .where("id", "=", membershipId)
    .where("team_id", "=", teamId)
    .where("left_date", "is", null)
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
}

export async function addTeamMember(
  db: Kysely<DB>,
  teamId: number,
  discordUserId: string,
  isCaptain: boolean,
  foundingMember = false,
): Promise<AddMemberResult> {
  const discordUser = await db
    .selectFrom("discord_user")
    .where("discord_user_id", "=", discordUserId)
    .selectAll()
    .executeTakeFirst();

  if (!discordUser) {
    return { type: "discord_user_not_found" };
  }

  return db.transaction().execute(async (trx) => {
    let player = await trx
      .selectFrom("player")
      .where("discord_id", "=", discordUserId)
      .selectAll()
      .executeTakeFirst();

    if (!player) {
      player = await trx
        .insertInto("player")
        .values({
          discord_id: discordUserId,
          name:
            discordUser.discord_display_name ||
            discordUser.discord_username ||
            discordUser.discord_nickname ||
            "Unknown User",
        })
        .onConflict((oc) => oc.column("discord_id").doNothing())
        .returningAll()
        .executeTakeFirst();

      // Race condition: another request inserted the player between our select and insert
      if (!player) {
        player = await trx
          .selectFrom("player")
          .where("discord_id", "=", discordUserId)
          .selectAll()
          .executeTakeFirstOrThrow();
      }
    }

    const conflict = await trx
      .selectFrom("membership")
      .select("id")
      .where("player_id", "=", player.id)
      .where((eb) => eb.or([
        eb("left_date", "is", null),
        eb("left_date", ">", new Date()),
      ]))
      .executeTakeFirst();

    if (conflict) {
      return { type: "conflict" } as const;
    }

    const joinDate = foundingMember ? FOUNDING_MEMBER_JOIN_DATE : new Date().toISOString().slice(0, 10);

    const membership = await trx
      .insertInto("membership")
      .values({
        team_id: teamId,
        player_id: player.id,
        is_captain: isCaptain,
        join_date: joinDate as any,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { type: "success", membership, playerName: player.name } as const;
  });
}
