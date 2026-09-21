import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";

type AddMemberResult =
  | { type: "discord_user_not_found" }
  | { type: "player_not_found" }
  | { type: "conflict" }
  | { type: "success"; membership: { id: number; player_id: number | null; team_id: number | null; is_captain: boolean }; playerName: string };

/**
 * Members can be identified either by a Discord user (creating the player row if
 * this is the first we've heard of them) or by an existing player — players with
 * results but no linked Discord account can only be reached the second way.
 */
export type MemberIdentifier =
  | { discordUserId: string }
  | { playerId: number };

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
  identifier: MemberIdentifier,
  isCaptain: boolean,
  foundingMember = false,
): Promise<AddMemberResult> {
  const discordUser =
    "discordUserId" in identifier
      ? await db
          .selectFrom("discord_user")
          .where("discord_user_id", "=", identifier.discordUserId)
          .selectAll()
          .executeTakeFirst()
      : undefined;

  if ("discordUserId" in identifier && !discordUser) {
    return { type: "discord_user_not_found" };
  }

  return db.transaction().execute(async (trx) => {
    let player;

    if ("playerId" in identifier) {
      player = await trx
        .selectFrom("player")
        .where("id", "=", identifier.playerId)
        .selectAll()
        .executeTakeFirst();

      if (!player) {
        return { type: "player_not_found" } as const;
      }
    } else {
      const discordUserId = identifier.discordUserId;

      player = await trx
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
              discordUser!.discord_display_name ||
              discordUser!.discord_username ||
              discordUser!.discord_nickname ||
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
