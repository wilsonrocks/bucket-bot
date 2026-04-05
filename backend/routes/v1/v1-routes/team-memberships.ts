import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import type { AppEnv } from "../../../hono-env.js";
import { addTeamMember } from "../../../logic/team-memberships.js";
import { canAccessTeam } from "../permissions.js";
import { MemberSchema } from "./teams.js";

const ErrorSchema = z.object({ error: z.string() });
const ForbiddenSchema = z.object({ error: z.string() });

// ── POST /teams/:teamId/members ────────────────────────────────────────────

const AddMemberBodySchema = z.object({
  discord_user_id: z.string().min(1),
  is_captain: z.boolean().default(false),
  founding_member: z.boolean().default(false),
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
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Discord user not found",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Player already in a team",
    },
  },
});

export const addTeamMemberHandler: RouteHandler<
  typeof addTeamMemberRoute,
  AppEnv
> = async (c) => {
  const teamId = Number(c.req.valid("param").teamId);
  const { id: userId } = c.get("jwtPayload") as { id: string };

  if (!(await canAccessTeam(userId, teamId, c.get("db")))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { discord_user_id, is_captain, founding_member } = c.req.valid("json");

  const result = await addTeamMember(
    c.get("db"),
    teamId,
    discord_user_id,
    is_captain,
    founding_member,
  );

  if (result.type === "discord_user_not_found") {
    return c.json({ error: "Discord user not found" }, 404);
  }

  if (result.type === "conflict") {
    return c.json({ error: "Player is already a member of a team" }, 409);
  }

  return c.json(
    {
      membership_id: result.membership.id,
      player_id: result.membership.player_id!,
      player_name: result.playerName,
      is_captain: result.membership.is_captain,
    } as any,
    201,
  );
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
      content: {
        "application/json": { schema: z.object({ success: z.literal(true) }) },
      },
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

export const updateTeamMemberHandler: RouteHandler<
  typeof updateTeamMemberRoute,
  AppEnv
> = async (c) => {
  const teamId = Number(c.req.valid("param").teamId);
  const membershipId = Number(c.req.valid("param").membershipId);
  const { id: userId } = c.get("jwtPayload") as { id: string };

  if (!(await canAccessTeam(userId, teamId, c.get("db")))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { is_captain } = c.req.valid("json");

  const result = await c
    .get("db")
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
      content: {
        "application/json": { schema: z.object({ success: z.literal(true) }) },
      },
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

export const removeTeamMemberHandler: RouteHandler<
  typeof removeTeamMemberRoute,
  AppEnv
> = async (c) => {
  const teamId = Number(c.req.valid("param").teamId);
  const membershipId = Number(c.req.valid("param").membershipId);
  const { id: userId } = c.get("jwtPayload") as { id: string };

  if (!(await canAccessTeam(userId, teamId, c.get("db")))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const result = await c
    .get("db")
    .updateTable("membership")
    .set({ left_date: new Date() })
    .where("id", "=", membershipId)
    .where("left_date", "is", null)
    .executeTakeFirst();

  if (!result.numUpdatedRows) {
    return c.json({ error: "Membership not found" }, 404);
  }

  return c.json({ success: true as const }, 200);
};
