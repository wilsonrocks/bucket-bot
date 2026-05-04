import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";

const ErrorSchema = z.object({ error: z.string() });

const UnmappedIdentitySchema = z.object({
  player_identity_id: z.number(),
  external_id: z.string(),
  name: z.string().nullable(),
  provider_name: z.string(),
  provider_id: z.string(),
  results: z.array(
    z.object({
      tourney_id: z.number().nullable(),
      tourney_name: z.string(),
      place: z.number().nullable(),
      faction: z.string(),
    }),
  ),
});

export const getUnmappedIdentitiesRoute = createRoute({
  method: "get",
  path: "/unmapped-identities",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(UnmappedIdentitySchema) } },
      description: "Player identities not linked to a player",
    },
  },
});

export const getUnmappedIdentities: RouteHandler<typeof getUnmappedIdentitiesRoute, AppEnv> = async (c) => {
  const allUnmappedPlayers = await c.get("db")
    .selectFrom("player_identity")
    .innerJoin("identity_provider", "player_identity.identity_provider_id", "identity_provider.id")
    .innerJoin("result", "result.player_identity_id", "player_identity.id")
    .innerJoin("tourney", "result.tourney_id", "tourney.id")
    .innerJoin("faction", "result.faction_code", "faction.name_code")
    .where("player_identity.player_id", "is", null)
    .where("player_identity.is_ignored", "=", false)
    .select([
      "player_identity.id as player_identity_id",
      "player_identity.external_id",
      "player_identity.provider_name as name",
      "identity_provider.name as provider_name",
      "identity_provider.id as provider_id",
      "result.tourney_id as tourney_id",
      "faction.name as faction_name",
      "tourney.name as tourney_name",
      "result.place as tourney_place",
    ])
    .execute();

  const grouped = new Map();

  for (const row of allUnmappedPlayers) {
    if (!grouped.has(row.player_identity_id)) {
      grouped.set(row.player_identity_id, {
        player_identity_id: row.player_identity_id,
        external_id: row.external_id,
        name: row.name,
        provider_name: row.provider_name,
        provider_id: row.provider_id,
        results: [],
      });
    }
    grouped.get(row.player_identity_id).results.push({
      tourney_id: row.tourney_id,
      tourney_name: row.tourney_name,
      place: row.tourney_place,
      faction: row.faction_name,
    });
  }

  return c.json(Array.from(grouped.values()) as any, 200);
};

export const setIdentityIgnoredRoute = createRoute({
  method: "post",
  path: "/player-identity/{id}/ignore",
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: {
      content: { "application/json": { schema: z.object({ ignored: z.boolean() }) } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ message: z.string() }) } },
      description: "Identity ignored status updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Identity not found",
    },
  },
});

export const setIdentityIgnored: RouteHandler<typeof setIdentityIgnoredRoute, AppEnv> = async (c) => {
  const { id } = c.req.valid("param");
  const { ignored } = c.req.valid("json");

  const result = await c.get("db")
    .updateTable("player_identity")
    .set({ is_ignored: ignored })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();

  if (!result) {
    return c.json({ error: "Identity not found" }, 404);
  }

  return c.json({ message: "Identity updated" }, 200);
};
