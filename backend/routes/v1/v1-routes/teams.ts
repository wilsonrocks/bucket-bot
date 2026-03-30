import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { canAccessTeam, isRankingReporter } from "../permissions.js";

const ErrorSchema = z.object({ error: z.string() });
const ForbiddenSchema = z.object({ error: z.string() });

const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  brand_colour: z.string().nullable(),
  image_key: z.string().nullable(),
  venue_id: z.number().nullable(),
  created_at: z.string().nullable(),
}).passthrough();

const MemberSchema = z.object({
  membership_id: z.number(),
  player_id: z.number(),
  player_name: z.string(),
  is_captain: z.boolean(),
});

const TeamWithMembersSchema = TeamSchema.extend({
  members: z.array(MemberSchema),
});

// ── GET /teams ─────────────────────────────────────────────────────────────

export const getTeamsRoute = createRoute({
  method: "get",
  path: "/teams",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TeamSchema) } },
      description: "List of all teams",
    },
  },
});

export const getTeamsHandler: RouteHandler<typeof getTeamsRoute, AppEnv> = async (c) => {
  const teams = await c.get("db")
    .selectFrom("team")
    .selectAll()
    .orderBy("name")
    .execute();
  return c.json(teams as any, 200);
};

// ── GET /teams/:id ─────────────────────────────────────────────────────────

export const getTeamByIdRoute = createRoute({
  method: "get",
  path: "/teams/{id}",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: TeamWithMembersSchema } },
      description: "Team with members",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Team not found",
    },
  },
});

export const getTeamByIdHandler: RouteHandler<typeof getTeamByIdRoute, AppEnv> = async (c) => {
  const id = Number(c.req.valid("param").id);

  const team = await c.get("db")
    .selectFrom("team")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  const members = await c.get("db")
    .selectFrom("membership")
    .innerJoin("player", "player.id", "membership.player_id")
    .select([
      "membership.id as membership_id",
      "membership.player_id",
      "player.name as player_name",
      "membership.is_captain",
    ])
    .where("membership.team_id", "=", id)
    .where("membership.left_date", "is", null)
    .orderBy("player.name")
    .execute();

  return c.json({ ...team, members } as any, 200);
};

// ── POST /create-team ──────────────────────────────────────────────────────

const CreateTeamBodySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  brand_colour: z.string().optional(),
});

export const createTeamRoute = createRoute({
  method: "post",
  path: "/create-team",
  request: {
    body: {
      content: { "application/json": { schema: CreateTeamBodySchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: TeamSchema } },
      description: "Team created",
    },
    403: {
      content: { "application/json": { schema: ForbiddenSchema } },
      description: "Forbidden",
    },
  },
});

export const createTeamHandler: RouteHandler<typeof createTeamRoute, AppEnv> = async (c) => {
  const { id: userId } = c.get("jwtPayload") as { id: string };

  if (!await isRankingReporter(userId)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { name, description, brand_colour } = c.req.valid("json");

  const team = await c.get("db")
    .insertInto("team")
    .values({
      name,
      ...(description !== undefined && { description }),
      ...(brand_colour !== undefined && { brand_colour }),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return c.json(team as any, 201);
};

// ── PUT /teams/:id ─────────────────────────────────────────────────────────

const UpdateTeamBodySchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  brand_colour: z.string().nullable().optional(),
  image_key: z.string().nullable().optional(),
  venue_id: z.number().nullable().optional(),
});

export const updateTeamRoute = createRoute({
  method: "put",
  path: "/teams/{id}",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: UpdateTeamBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: TeamSchema } },
      description: "Team updated",
    },
    403: {
      content: { "application/json": { schema: ForbiddenSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Team not found",
    },
  },
});

export const updateTeamHandler: RouteHandler<typeof updateTeamRoute, AppEnv> = async (c) => {
  const id = Number(c.req.valid("param").id);
  const { id: userId } = c.get("jwtPayload") as { id: string };

  if (!await canAccessTeam(userId, id, c.get("db"))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = c.req.valid("json");

  const team = await c.get("db")
    .updateTable("team")
    .set(body)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();

  if (!team) {
    return c.json({ error: "Team not found" }, 404);
  }

  return c.json(team as any, 200);
};

// ── DELETE /teams/:id ──────────────────────────────────────────────────────

export const deleteTeamRoute = createRoute({
  method: "delete",
  path: "/teams/{id}",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.literal(true) }) } },
      description: "Team deleted",
    },
    403: {
      content: { "application/json": { schema: ForbiddenSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Team not found",
    },
  },
});

export const deleteTeamHandler: RouteHandler<typeof deleteTeamRoute, AppEnv> = async (c) => {
  const id = Number(c.req.valid("param").id);
  const { id: userId } = c.get("jwtPayload") as { id: string };

  if (!await isRankingReporter(userId)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const result = await c.get("db")
    .deleteFrom("team")
    .where("id", "=", id)
    .executeTakeFirst();

  if (!result.numDeletedRows) {
    return c.json({ error: "Team not found" }, 404);
  }

  return c.json({ success: true as const }, 200);
};

// ── POST /teams/:teamId/members ────────────────────────────────────────────

const AddMemberBodySchema = z.object({
  player_id: z.number(),
  is_captain: z.boolean().default(false),
});

export const addTeamMemberRoute = createRoute({
  method: "post",
  path: "/teams/{teamId}/members",
  request: {
    params: z.object({ teamId: z.string() }),
    body: {
      content: { "application/json": { schema: AddMemberBodySchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: MemberSchema } },
      description: "Member added",
    },
    403: {
      content: { "application/json": { schema: ForbiddenSchema } },
      description: "Forbidden",
    },
  },
});

export const addTeamMemberHandler: RouteHandler<typeof addTeamMemberRoute, AppEnv> = async (c) => {
  const teamId = Number(c.req.valid("param").teamId);
  const { id: userId } = c.get("jwtPayload") as { id: string };

  if (!await canAccessTeam(userId, teamId, c.get("db"))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { player_id, is_captain } = c.req.valid("json");

  const membership = await c.get("db")
    .insertInto("membership")
    .values({ team_id: teamId, player_id, is_captain })
    .returningAll()
    .executeTakeFirstOrThrow();

  const player = await c.get("db")
    .selectFrom("player")
    .select(["name"])
    .where("id", "=", player_id)
    .executeTakeFirstOrThrow();

  return c.json({
    membership_id: membership.id,
    player_id: membership.player_id!,
    player_name: player.name,
    is_captain: membership.is_captain,
  } as any, 201);
};

// ── PATCH /teams/:teamId/members/:membershipId ─────────────────────────────

const UpdateMemberBodySchema = z.object({
  is_captain: z.boolean(),
});

export const updateTeamMemberRoute = createRoute({
  method: "patch",
  path: "/teams/{teamId}/members/{membershipId}",
  request: {
    params: z.object({ teamId: z.string(), membershipId: z.string() }),
    body: {
      content: { "application/json": { schema: UpdateMemberBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.literal(true) }) } },
      description: "Member updated",
    },
    403: {
      content: { "application/json": { schema: ForbiddenSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Membership not found",
    },
  },
});

export const updateTeamMemberHandler: RouteHandler<typeof updateTeamMemberRoute, AppEnv> = async (c) => {
  const teamId = Number(c.req.valid("param").teamId);
  const membershipId = Number(c.req.valid("param").membershipId);
  const { id: userId } = c.get("jwtPayload") as { id: string };

  if (!await canAccessTeam(userId, teamId, c.get("db"))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { is_captain } = c.req.valid("json");

  const result = await c.get("db")
    .updateTable("membership")
    .set({ is_captain })
    .where("id", "=", membershipId)
    .executeTakeFirst();

  if (!result.numUpdatedRows) {
    return c.json({ error: "Membership not found" }, 404);
  }

  return c.json({ success: true as const }, 200);
};

// ── DELETE /teams/:teamId/members/:membershipId ────────────────────────────

export const removeTeamMemberRoute = createRoute({
  method: "delete",
  path: "/teams/{teamId}/members/{membershipId}",
  request: {
    params: z.object({ teamId: z.string(), membershipId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.literal(true) }) } },
      description: "Member removed",
    },
    403: {
      content: { "application/json": { schema: ForbiddenSchema } },
      description: "Forbidden",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Membership not found",
    },
  },
});

export const removeTeamMemberHandler: RouteHandler<typeof removeTeamMemberRoute, AppEnv> = async (c) => {
  const teamId = Number(c.req.valid("param").teamId);
  const membershipId = Number(c.req.valid("param").membershipId);
  const { id: userId } = c.get("jwtPayload") as { id: string };

  if (!await canAccessTeam(userId, teamId, c.get("db"))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const result = await c.get("db")
    .deleteFrom("membership")
    .where("id", "=", membershipId)
    .executeTakeFirst();

  if (!result.numDeletedRows) {
    return c.json({ error: "Membership not found" }, 404);
  }

  return c.json({ success: true as const }, 200);
};
