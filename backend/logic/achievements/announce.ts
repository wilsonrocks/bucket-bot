import { formatDate, parseISO } from "date-fns";
import { EmbedBuilder, TextChannel, embedLength } from "discord.js";
import { sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import {
  getDiscordClient,
  mentionUserInGuild,
  UK_MALIFAUX_SERVER_ID,
} from "../discord-client";

/** Discord allows at most 10 embeds per message... */
export const MAX_EMBEDS_PER_MESSAGE = 10;
/** ...and at most 6000 characters across all of a message's embeds. */
export const MAX_EMBED_CHARS_PER_MESSAGE = 6000;

export interface AnnouncedAchievement {
  achievementId: string;
  name: string;
  description: string;
  flavourText: string;
  flavourSource: string | null;
  imageKey: string | null;
  tourneyName: string | null;
  /** ISO date (yyyy-MM-dd). */
  achievedOn: string;
}

export function buildAchievementEmbed(
  a: AnnouncedAchievement,
  assetsUrl: string | undefined = process.env.ASSETS_URL,
): EmbedBuilder {
  // Text is filled in from admin, so any of it may still be blank.
  const sections: string[] = [];
  if (a.description.trim()) sections.push(a.description);
  if (a.flavourText.trim()) {
    const quote = a.flavourText.split("\n").map((line) => `> *${line}*`);
    if (a.flavourSource) quote.push(`> — ${a.flavourSource}`);
    sections.push(quote.join("\n"));
  }
  const date = formatDate(parseISO(a.achievedOn), "d MMM yyyy");
  sections.push(
    a.tourneyName ? `Earned at **${a.tourneyName}** on ${date}` : `Earned on ${date}`,
  );

  const embed = new EmbedBuilder()
    .setTitle(a.name)
    .setDescription(sections.join("\n\n"));
  if (a.imageKey && assetsUrl) {
    embed.setThumbnail(`${assetsUrl}/${a.imageKey}-w400.webp`);
  }
  return embed;
}

/**
 * Builds one Discord message from a player's pending achievements, adding
 * them one at a time and stopping before the message would break Discord's
 * limits (10 embeds, 6000 embed characters). `included` lists the achievements
 * that made it in; the rest stay pending for a later post.
 */
export function buildAchievementMessage(
  mention: string,
  achievements: AnnouncedAchievement[],
  assetsUrl: string | undefined = process.env.ASSETS_URL,
): {
  content: string;
  embeds: EmbedBuilder[];
  included: AnnouncedAchievement[];
} {
  const embeds: EmbedBuilder[] = [];
  const included: AnnouncedAchievement[] = [];
  let chars = 0;

  for (const achievement of achievements) {
    if (embeds.length === MAX_EMBEDS_PER_MESSAGE) break;
    const embed = buildAchievementEmbed(achievement, assetsUrl);
    const length = embedLength(embed.data);
    // A single embed always fits: EmbedBuilder caps title (256) and
    // description (4096), and the admin form caps the text well below that.
    if (chars + length > MAX_EMBED_CHARS_PER_MESSAGE) break;
    embeds.push(embed);
    included.push(achievement);
    chars += length;
  }

  const content =
    included.length === 1
      ? `🏅 ${mention} has earned a new achievement!`
      : `🏅 ${mention} has earned ${included.length} new achievements!`;

  return { content, embeds, included };
}

let isRunning = false;

/**
 * Announces the pending achievements of one randomly chosen player, in one
 * message, then records the message id against those awards. Each player with
 * anything pending is equally likely, however many achievements they have.
 * Returns the player id announced, or null if the queue was empty.
 */
export async function announceNextPlayer(db: Kysely<DB>): Promise<number | null> {
  if (isRunning) return null;
  isRunning = true;
  try {
    const next = await db
      .selectFrom(
        db
          .selectFrom("player_achievement")
          .where("discord_message_id", "is", null)
          .select("player_id")
          .distinct()
          .as("pending"),
      )
      .select("pending.player_id")
      .orderBy(sql`random()`)
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
        "achievement.description",
        "achievement.flavour_text as flavourText",
        "achievement.flavour_source as flavourSource",
        "achievement.image_key as imageKey",
        "tourney.name as tourneyName",
        sql<string>`to_char(player_achievement.achieved_on, 'YYYY-MM-DD')`.as("achievedOn"),
      ])
      .orderBy("achievement.display_order")
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
    const { content, embeds, included } = buildAchievementMessage(
      mention,
      achievements,
    );
    const message = await channel.send({ content, embeds });

    await db
      .updateTable("player_achievement")
      .set({ discord_message_id: message.id })
      .where("player_id", "=", next.player_id)
      .where(
        "achievement_id",
        "in",
        included.map((a) => a.achievementId),
      )
      .execute();

    return next.player_id;
  } finally {
    isRunning = false;
  }
}
