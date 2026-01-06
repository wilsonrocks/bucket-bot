import { Context } from "koa";
import { success } from "zod";

export const getAllVenuesHandler = async (ctx: Context) => {
  const venues = await ctx.state.db
    .selectFrom("venue")
    .selectAll()
    .orderBy("name")
    .execute();
  ctx.response.body = venues;
};

export const createVenueHandler = async (ctx: Context) => {
  const { name, town, postCode } = ctx.request.body as {
    name: string;
    town: string;
    postCode: string;
  };

  if (!name || !town || !postCode) {
    ctx.throw(400, "Missing required fields: name, town, postCode");
  }

  await ctx.state.db
    .insertInto("venue")
    .values({
      name,
      town,
      post_code: postCode,
    })
    .execute();

  ctx.response.status = 201;
  ctx.response.body = {
    success: true,
  };
};
