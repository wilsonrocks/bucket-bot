import { formatDate, parseISO } from "date-fns";
import { EmbedBuilder, TextChannel } from "discord.js";
import { sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import {
  getDiscordClient,
  mentionUserInGuild,
  UK_MALIFAUX_SERVER_ID,
} from "../discord-client";

/** Discord allows at most 10 embeds per message. */
export const MAX_EMBEDS_PER_MESSAGE = 10;

export interface AnnouncedAchievement {
  achievementId: string;
  name: string;
  flavourText: string;
  flavourSource: string | null;
  imageKey: string | null;
  tourneyName: string | null;
  /** ISO date (yyyy-MM-dd). */
  achievedOn: string;
}

export function buildAchievementMessage(
  mention: string,
  achievements: AnnouncedAchievement[],
  assetsUrl: string | undefined = process.env.ASSETS_URL,
): { content: string; embeds: EmbedBuilder[] } {
  const content =
    achievements.length === 1
      ? `🏅 ${mention} has earned a new achievement!`
      : `🏅 ${mention} has earned ${achievements.length} new achievements!`;

  const embeds = achievements.map((a) => {
    const quote = a.flavourText
      .split("\n")
      .map((line) => `> *${line}*`)
      .join("\n");
    const lines = [quote];
    if (a.flavourSource) lines.push(`> — ${a.flavourSource}`);
    const date = formatDate(parseISO(a.achievedOn), "d MMM yyyy");
    lines.push(
      "",
      a.tourneyName ? `Earned at **${a.tourneyName}** on ${date}` : `Earned on ${date}`,
    );

    const embed = new EmbedBuilder()
      .setTitle(a.name)
      .setDescription(lines.join("\n"));
    if (a.imageKey && assetsUrl) {
      embed.setThumbnail(`${assetsUrl}/${a.imageKey}-w400.webp`);
    }
    return embed;
  });

  return { content, embeds };
}

let isRunning = false;

/**
 * Announces the pending achievements of the single player who has waited
 * longest, in one message, then records the message id against those awards.
 * Returns the player id announced, or null if the queue was empty.
 */
export async function announceNextPlayer(db: Kysely<DB>): Promise<number | null> {
  if (isRunning) return null;
  isRunning = true;
  try {
    const next = await db
      .selectFrom("player_achievement")
      .where("discord_message_id", "is", null)
      .select("player_id")
      .orderBy("awarded_at")
      .orderBy("player_id")
      .limit(1)
      .executeTakeFirst();
    if (!next) return null;

    const player = await db
      .selectFrom("player")
      .leftJoin("discord_user", "discord_user.discord_user_id", "player.discord_id")
      .where("player.id", "=", next.player_id)
      .select([
        "player.name",
        "discord_user.discord_user_id",
        "discord_user.discord_display_name",
      ])
      .executeTakeFirstOrThrow();

    const achievements = await db
      .selectFrom("player_achievement")
      .innerJoin("achievement", "achievement.id", "player_achievement.achievement_id")
      .leftJoin("tourney", "tourney.id", "player_achievement.tourney_id")
      .where("player_achievement.player_id", "=", next.player_id)
      .where("player_achievement.discord_message_id", "is", null)
      .select([
        "achievement.id as achievementId",
        "achievement.name",
        "achievement.flavour_text as flavourText",
        "achievement.flavour_source as flavourSource",
        "achievement.image_key as imageKey",
        "tourney.name as tourneyName",
        sql<string>`to_char(player_achievement.achieved_on, 'YYYY-MM-DD')`.as("achievedOn"),
      ])
      .orderBy("achievement.display_order")
      .limit(MAX_EMBEDS_PER_MESSAGE)
      .execute();

    const channelId = process.env.DISCORD_ACHIEVEMENTS_CHANNEL_ID;
    if (!channelId) {
      throw new Error("DISCORD_ACHIEVEMENTS_CHANNEL_ID is not set");
    }

    const discordClient = await getDiscordClient();
    const channel = await discordClient.channels.fetch(channelId);
    if (!(channel instanceof TextChannel)) {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }
    if (!channel.isSendable()) {
      throw new Error(`Channel ${channelId} is not sendable`);
    }

    const guild = await discordClient.guilds.fetch(UK_MALIFAUX_SERVER_ID);
    const mention = await mentionUserInGuild(guild, player);
    const message = await channel.send(
      buildAchievementMessage(mention, achievements),
    );

    await db
      .updateTable("player_achievement")
      .set({ discord_message_id: message.id })
      .where("player_id", "=", next.player_id)
      .where(
        "achievement_id",
        "in",
        achievements.map((a) => a.achievementId),
      )
      .execute();

    return next.player_id;
  } finally {
    isRunning = false;
  }
}
