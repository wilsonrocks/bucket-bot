import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { UK_MALIFAUX_SERVER_ID, getDiscordClient } from "../../../logic/discord-client.js";

export const botChatRouter = new OpenAPIHono<AppEnv>();

const getChannelsRoute = createRoute({
  method: "get",
  path: "/channels",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(z.object({ name: z.string().nullable(), id: z.string().nullable() })),
        },
      },
      description: "List of guild channels",
    },
  },
});

botChatRouter.openapi(getChannelsRoute, async (c) => {
  const discordClient = await getDiscordClient();
  const guild = await discordClient.guilds.fetch(UK_MALIFAUX_SERVER_ID);
  const channels = await guild.channels.fetch();

  const channelList = channels
    .mapValues((channel) => ({ name: channel?.name ?? null, id: channel?.id ?? null }))
    .sort((a, b) => (String(a.name) > String(b.name) ? 1 : -1))
    .map((v) => v);

  return c.json(channelList as any, 200);
});

const PostMessageBodySchema = z.object({
  channelId: z.string(),
  message: z.string(),
});

const postMessageRoute = createRoute({
  method: "post",
  path: "/post-message",
  request: {
    body: {
      content: { "application/json": { schema: PostMessageBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.literal(true) }) } },
      description: "Message posted",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Channel not found",
    },
  },
});

botChatRouter.openapi(postMessageRoute, async (c) => {
  const { channelId, message } = c.req.valid("json");
  const discordClient = await getDiscordClient();

  const channel = await discordClient.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    return c.json({ error: "Channel not found or is not text-based" }, 404);
  }

  if (!channel.isSendable()) {
    return c.json({ error: "Channel not found or is not text-based" }, 404);
  }

  await channel.send(message);
  return c.json({ success: true as const }, 200);
});

const clearTestChannelRoute = createRoute({
  method: "post",
  path: "/clear-test-channel",
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ deleted: z.number() }) } },
      description: "Messages deleted",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Channel not found",
    },
  },
});

botChatRouter.openapi(clearTestChannelRoute, async (c) => {
  const channelId = process.env.DISCORD_TEST_CHANNEL_ID!;
  const discordClient = await getDiscordClient();
  const channel = await discordClient.channels.fetch(channelId);

  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    return c.json({ error: "Channel not found or not a guild text channel" }, 404);
  }

  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  let totalDeleted = 0;

  while (true) {
    const messages = await channel.messages.fetch({ limit: 100 });
    if (messages.size === 0) break;

    const recent = messages.filter((m) => m.createdTimestamp > twoWeeksAgo);
    const old = messages.filter((m) => m.createdTimestamp <= twoWeeksAgo);

    if (recent.size >= 2) {
      const deleted = await channel.bulkDelete(recent);
      totalDeleted += deleted.size;
    } else if (recent.size === 1) {
      await recent.first()!.delete();
      totalDeleted++;
    }

    for (const msg of old.values()) {
      await msg.delete();
      totalDeleted++;
    }

    if (messages.size < 100) break;
  }

  return c.json({ deleted: totalDeleted }, 200);
});
