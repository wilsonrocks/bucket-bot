import { Router } from "@koa/router";
import { getDiscordClient, UK_MALIFAUX_SERVER_ID } from "../discord-client";

export const botChatRouter = new Router();

botChatRouter.get("/channels", async (ctx) => {
  const discordClient = await getDiscordClient();
  const guildId = UK_MALIFAUX_SERVER_ID;
  const guild = await discordClient.guilds.fetch(guildId);

  const channels = await guild.channels.fetch();

  ctx.response.body = channels
    .mapValues((channel) => ({
      name: channel?.name,
      id: channel?.id,
    }))
    .sort((a, b) => (String(a.name) > String(b.name) ? 1 : -1));
});

botChatRouter.post("/post-message", async (ctx) => {
  const discordClient = await getDiscordClient();
  const body = ctx.request.body as { channelId: string; message: string };
  const channelId = body.channelId;
  const message = body.message;

  if (!channelId || !message) {
    ctx.response.status = 400;
    ctx.response.body = { error: "channelId and message are required" };
    return;
  }

  const channel = await discordClient.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Channel not found or is not text-based" };
    return;
  }

  if (!channel.isSendable()) return;
  await channel.send(message);

  ctx.response.status = 200;
  ctx.response.body = { success: true };
});
