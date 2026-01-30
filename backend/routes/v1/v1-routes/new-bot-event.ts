import { Context } from "koa";
import { z } from "zod";

const newBotEventValidator = z.object({
  eventName: z.string(),
  organiserDiscordId: z.string(),
  venueId: z.string(),
  rounds: z.number(),
  days: z.number(),
  tier: z.string(),
  results: z.array(
    z.object({
      name: z.string(),
      place: z.number(),
      played: z.number(),
      faction: z.string(),
    }),
  ),
});

export const newBotEventHandler = async (ctx: Context) => {
  let parsedData;
  try {
    const body = ctx.request.body;
    parsedData = newBotEventValidator.parse(body);
  } catch (err) {
    ctx.throw(400, `Invalid request body ${err}`);
  }

  ctx.response.body = {
    message: "BOT event received successfully",
    data: parsedData,
  };
};
