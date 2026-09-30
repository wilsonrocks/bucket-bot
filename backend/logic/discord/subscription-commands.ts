import {
  Events,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { getDiscordClient, UK_MALIFAUX_SERVER_ID } from "../discord-client";

export const SUBSCRIBE_COMMAND = "keepmeinformed";
export const UNSUBSCRIBE_COMMAND = "stopinformingme";

/**
 * Subscribes a Discord user to ranking-change DMs. Safe to call repeatedly.
 * `linked` says whether a player is linked to that Discord account — without
 * one there are no rankings to report on.
 */
export async function subscribe(
  db: Kysely<DB>,
  discordUserId: string,
): Promise<{ linked: boolean }> {
  await db
    .insertInto("ranking_subscription")
    .values({ discord_user_id: discordUserId })
    .onConflict((oc) => oc.column("discord_user_id").doNothing())
    .execute();

  const player = await db
    .selectFrom("player")
    .where("discord_id", "=", discordUserId)
    .select("id")
    .executeTakeFirst();

  return { linked: !!player };
}

/** Removes a subscription. `wasSubscribed` is false if there was none. */
export async function unsubscribe(
  db: Kysely<DB>,
  discordUserId: string,
): Promise<{ wasSubscribed: boolean }> {
  const deleted = await db
    .deleteFrom("ranking_subscription")
    .where("discord_user_id", "=", discordUserId)
    .returning("discord_user_id")
    .execute();

  return { wasSubscribed: deleted.length > 0 };
}

export function subscribeReply({ linked }: { linked: boolean }): string {
  const base = `You're subscribed. I'll DM you whenever your ranking changes. Use /${UNSUBSCRIBE_COMMAND} to stop.`;
  return linked
    ? base
    : `${base}\n\nI can't find a player linked to your Discord account yet, so nothing will arrive until a ranking reporter links it.`;
}

export function unsubscribeReply({
  wasSubscribed,
}: {
  wasSubscribed: boolean;
}): string {
  return wasSubscribed
    ? `You're unsubscribed. I won't DM you about ranking changes any more. Use /${SUBSCRIBE_COMMAND} to start again.`
    : `You weren't subscribed. Use /${SUBSCRIBE_COMMAND} to get ranking updates.`;
}

async function handleCommand(
  db: Kysely<DB>,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  let content: string;
  if (interaction.commandName === SUBSCRIBE_COMMAND) {
    content = subscribeReply(await subscribe(db, interaction.user.id));
  } else if (interaction.commandName === UNSUBSCRIBE_COMMAND) {
    content = unsubscribeReply(await unsubscribe(db, interaction.user.id));
  } else {
    return;
  }
  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

/**
 * Registers the subscription slash commands on the UK Malifaux server and
 * starts answering them. Should only be called in production (gate on
 * ENABLE_DISCORD_COMMANDS): every process logged in with the bot token
 * receives each interaction, so a dev backend would race prod to reply.
 */
export async function startDiscordCommands(db: Kysely<DB>): Promise<void> {
  const discordClient = await getDiscordClient();
  const guild = await discordClient.guilds.fetch(UK_MALIFAUX_SERVER_ID);

  await guild.commands.set([
    new SlashCommandBuilder()
      .setName(SUBSCRIBE_COMMAND)
      .setDescription("Get a DM whenever your ranking changes")
      .toJSON(),
    new SlashCommandBuilder()
      .setName(UNSUBSCRIBE_COMMAND)
      .setDescription("Stop getting DMs about your ranking")
      .toJSON(),
  ]);

  discordClient.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await handleCommand(db, interaction);
    } catch (err) {
      console.error(`Failed to handle /${interaction.commandName}:`, err);
      if (!interaction.replied) {
        await interaction
          .reply({
            content: "Something went wrong. Please try again later.",
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  });

  console.log("Discord slash commands registered");
}
