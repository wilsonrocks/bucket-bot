import { Context } from "koa";
import { sql } from "kysely";
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

  const postcodeResponse = await fetch(
    `https://api.postcodes.io/postcodes/${postCode}`
  );

  // if (!postcodeResponse.ok) {
  //   return ctx.throw(400, "Problem requesting lat/long for postcode");
  // }

  const postcodeData = await postcodeResponse.json();
  if (postcodeData.status >= 400) {
    return ctx.throw(postcodeData.status, postcodeData.error);
  }

  const { latitude, longitude } = postcodeData.result;

  await ctx.state.db
    .insertInto("venue")
    .values({
      name,
      town,
      post_code: postCode,
      geom: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
    })
    .execute();

  ctx.response.status = 201;
  ctx.response.body = {
    success: true,
  };
};
