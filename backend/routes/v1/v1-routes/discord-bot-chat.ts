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
