import { Context } from "koa";
import { z } from "zod";

const newBotEventValidator = z.object({
  tournament: z.object({
    eventName: z.string(),
    organiserId: z.string(),
    venueId: z.string(),
    rounds: z.number(),
    days: z.number(),
    tier: z.string(),
  }),
  results: z.array(
    z.object({
      name: z.string(),
      place: z.number(),
      played: z.number(),
      faction: z.string(),
    }),
  ),
});

export const newBotEventHandler = async (context: Context) => {};
