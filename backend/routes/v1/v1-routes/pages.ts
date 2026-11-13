import { createRoute, z, type RouteHandler } from "@hono/zod-openapi";
import { sql, type Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import type { AppEnv } from "../../../hono-env";
import { validatePageContent } from "../../../logic/pages/content-schema";
import { normaliseUrl, validatePageUrl } from "../../../logic/pages/reserved-paths";
import { isRankingReporter } from "../permissions";

// CMS static pages. Every save appends a page_version; the highest version is live.
// page.url mirrors the latest version's URL so the database enforces uniqueness.

const ErrorSchema = z.object({ error: z.string() });

// ProseMirror JSON. Its shape is checked by validatePageContent in the handlers;
// here it's opaque because recursive schemas don't generate a usable client.
const ContentSchema = z.record(z.string(), z.unknown());

const PageSummarySchema = z.object({
  id: z.number(),
  url: z.string(),
  visible: z.boolean(),
  nav_order: z.number().nullable(),
  title: z.string(),
  version: z.number(),
  updated_at: z.string(),
});

const PageVersionSummarySchema = z.object({
  version: z.number(),
  url: z.string(),
  title: z.string(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  author_name: z.string().nullable(),
});

const PageVersionSchema = PageVersionSummarySchema.extend({
  description: z.string(),
  content: ContentSchema,
});

const PageDetailSchema = z.object({
  id: z.number(),
  visible: z.boolean(),
  nav_order: z.number().nullable(),
  latest: PageVersionSchema,
});

const PageFieldsSchema = z.object({
  url: z.string(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(300),
  content: ContentSchema,
});

const PageSettingsSchema = z.object({
  visible: z.boolean().optional(),
  nav_order: z.number().int().nullable().optional(),
});

const IdParams = z.object({ id: z.coerce.number().int().positive() });

const forbidden = { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" };
const notFound = { content: { "application/json": { schema: ErrorSchema } }, description: "Page not found" };
const badRequest = { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid page" };

function userIdOf(c: { get: (key: "jwtPayload") => unknown }): string {
  return (c.get("jwtPayload") as { id: string }).id;
}

function iso(d: Date | string): string {
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

function isUniqueViolation(e: unknown, constraint: string): boolean {
  return (
    typeof e === "object" && e !== null &&
    (e as { code?: string }).code === "23505" &&
    (e as { constraint?: string }).constraint === constraint
  );
}

const authorName = sql<string | null>`COALESCE(discord_user.discord_nickname, discord_user.discord_display_name, discord_user.discord_username)`;

function selectVersions(db: Kysely<DB>, pageId: number) {
  return db
    .selectFrom("page_version")
    .leftJoin("discord_user", "discord_user.discord_user_id", "page_version.created_by")
    .select([
      "page_version.version",
      "page_version.url",
      "page_version.title",
      "page_version.description",
      "page_version.content",
      "page_version.created_at",
      "page_version.created_by",
      authorName.as("author_name"),
    ])
    .where("page_version.page_id", "=", pageId);
}

type VersionRow = Awaited<ReturnType<ReturnType<typeof selectVersions>["executeTakeFirstOrThrow"]>>;

function toVersion(row: VersionRow): z.infer<typeof PageVersionSchema> {
  return {
    version: row.version,
    url: row.url,
    title: row.title,
    description: row.description,
    content: row.content as Record<string, unknown>,
    created_at: iso(row.created_at),
    created_by: row.created_by,
    author_name: row.author_name,
  };
}

/** Normalises and validates the editable fields, returning an error message or the cleaned values. */
function checkFields(body: z.infer<typeof PageFieldsSchema>) {
  const url = normaliseUrl(body.url);
  const error = validatePageUrl(url) ?? validatePageContent(body.content);
  if (error) return { error };
  return { values: { url, title: body.title, description: body.description, content: JSON.stringify(body.content) } };
}

const URL_TAKEN = "That URL is already used by another page";

// ── GET /pages ──────────────────────────────────────────────────────────────

export const getPagesRoute = createRoute({
  method: "get",
  path: "/pages",
  responses: {
    200: { content: { "application/json": { schema: z.array(PageSummarySchema) } }, description: "All CMS pages" },
    403: forbidden,
  },
});

export const getPagesHandler: RouteHandler<typeof getPagesRoute, AppEnv> = async (c) => {
  if (!await isRankingReporter(userIdOf(c))) return c.json({ error: "Forbidden" }, 403);

  const db = c.get("db");
  const latest = db
    .selectFrom("page_version")
    .distinctOn("page_version.page_id")
    .select(["page_version.page_id", "page_version.title", "page_version.version", "page_version.created_at"])
    .orderBy("page_version.page_id")
    .orderBy("page_version.version", "desc")
    .as("latest");

  const rows = await db
    .selectFrom("page")
    .innerJoin(latest, "latest.page_id", "page.id")
    .select(["page.id", "page.url", "page.visible", "page.nav_order", "latest.title", "latest.version", "latest.created_at"])
    .orderBy("page.url")
    .execute();

  return c.json(
    rows.map(({ created_at, ...r }) => ({ ...r, updated_at: iso(created_at) })),
    200,
  );
};

// ── GET /pages/{id} ─────────────────────────────────────────────────────────

export const getPageRoute = createRoute({
  method: "get",
  path: "/pages/{id}",
  request: { params: IdParams },
  responses: {
    200: { content: { "application/json": { schema: PageDetailSchema } }, description: "Page with its latest version" },
    403: forbidden,
    404: notFound,
  },
});

export const getPageHandler: RouteHandler<typeof getPageRoute, AppEnv> = async (c) => {
  if (!await isRankingReporter(userIdOf(c))) return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.valid("param");
  const db = c.get("db");
  const page = await db.selectFrom("page").select(["id", "visible", "nav_order"]).where("id", "=", id).executeTakeFirst();
  if (!page) return c.json({ error: "Page not found" }, 404);

  const latest = await selectVersions(db, id).orderBy("page_version.version", "desc").limit(1).executeTakeFirstOrThrow();
  return c.json({ ...page, latest: toVersion(latest) }, 200);
};

// ── GET /pages/{id}/versions ────────────────────────────────────────────────

export const getPageVersionsRoute = createRoute({
  method: "get",
  path: "/pages/{id}/versions",
  request: { params: IdParams },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(PageVersionSummarySchema) } },
      description: "Version history, newest first",
    },
    403: forbidden,
    404: notFound,
  },
});

export const getPageVersionsHandler: RouteHandler<typeof getPageVersionsRoute, AppEnv> = async (c) => {
  if (!await isRankingReporter(userIdOf(c))) return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.valid("param");
  const rows = await selectVersions(c.get("db"), id).orderBy("page_version.version", "desc").execute();
  if (!rows.length) return c.json({ error: "Page not found" }, 404);

  return c.json(
    rows.map((r) => {
      const { description: _d, content: _c, ...summary } = toVersion(r);
      return summary;
    }),
    200,
  );
};

// ── GET /pages/{id}/versions/{version} ─────────────────────────────────────

export const getPageVersionRoute = createRoute({
  method: "get",
  path: "/pages/{id}/versions/{version}",
  request: { params: IdParams.extend({ version: z.coerce.number().int().positive() }) },
  responses: {
    200: { content: { "application/json": { schema: PageVersionSchema } }, description: "One version in full" },
    403: forbidden,
    404: notFound,
  },
});

export const getPageVersionHandler: RouteHandler<typeof getPageVersionRoute, AppEnv> = async (c) => {
  if (!await isRankingReporter(userIdOf(c))) return c.json({ error: "Forbidden" }, 403);

  const { id, version } = c.req.valid("param");
  const row = await selectVersions(c.get("db"), id).where("page_version.version", "=", version).executeTakeFirst();
  if (!row) return c.json({ error: "Version not found" }, 404);
  return c.json(toVersion(row), 200);
};

// ── POST /pages ─────────────────────────────────────────────────────────────

export const createPageRoute = createRoute({
  method: "post",
  path: "/pages",
  request: {
    body: { content: { "application/json": { schema: PageFieldsSchema.extend(PageSettingsSchema.shape) } } },
  },
  responses: {
    201: { content: { "application/json": { schema: z.object({ id: z.number() }) } }, description: "Page created" },
    400: badRequest,
    403: forbidden,
    409: { content: { "application/json": { schema: ErrorSchema } }, description: "URL already in use" },
  },
});

export const createPageHandler: RouteHandler<typeof createPageRoute, AppEnv> = async (c) => {
  const userId = userIdOf(c);
  if (!await isRankingReporter(userId)) return c.json({ error: "Forbidden" }, 403);

  const body = c.req.valid("json");
  const checked = checkFields(body);
  if ("error" in checked) return c.json({ error: checked.error! }, 400);
  const { values } = checked;

  try {
    const id = await c.get("db").transaction().execute(async (trx) => {
      const page = await trx
        .insertInto("page")
        .values({ url: values.url, visible: body.visible ?? true, nav_order: body.nav_order ?? null })
        .returning("id")
        .executeTakeFirstOrThrow();
      await trx
        .insertInto("page_version")
        .values({ ...values, page_id: page.id, version: 1, created_by: userId })
        .execute();
      return page.id;
    });
    return c.json({ id }, 201);
  } catch (e) {
    if (isUniqueViolation(e, "page_url_key")) return c.json({ error: URL_TAKEN }, 409);
    throw e;
  }
};

// ── POST /pages/{id}/versions ───────────────────────────────────────────────

export const savePageVersionRoute = createRoute({
  method: "post",
  path: "/pages/{id}/versions",
  request: {
    params: IdParams,
    body: {
      content: {
        "application/json": {
          // base_version: the version the edit started from, to catch concurrent edits.
          schema: PageFieldsSchema.extend({ base_version: z.number().int().positive() }),
        },
      },
    },
  },
  responses: {
    201: { content: { "application/json": { schema: z.object({ version: z.number() }) } }, description: "Version saved" },
    400: badRequest,
    403: forbidden,
    404: notFound,
    409: {
      content: { "application/json": { schema: ErrorSchema.extend({ latest_version: z.number().optional() }) } },
      description: "Someone else saved first, or the URL is in use",
    },
  },
});

export const savePageVersionHandler: RouteHandler<typeof savePageVersionRoute, AppEnv> = async (c) => {
  const userId = userIdOf(c);
  if (!await isRankingReporter(userId)) return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const checked = checkFields(body);
  if ("error" in checked) return c.json({ error: checked.error! }, 400);
  const { values } = checked;

  type Outcome = { kind: "saved"; version: number } | { kind: "missing" } | { kind: "stale"; latest: number };

  let outcome: Outcome;
  try {
    outcome = await c.get("db").transaction().execute(async (trx): Promise<Outcome> => {
      // Lock the page so concurrent saves queue up behind each other.
      const page = await trx.selectFrom("page").select("id").where("id", "=", id).forUpdate().executeTakeFirst();
      if (!page) return { kind: "missing" };

      const { latest } = await trx
        .selectFrom("page_version")
        .select((eb) => eb.fn.max("version").as("latest"))
        .where("page_id", "=", id)
        .executeTakeFirstOrThrow();
      const latestVersion = Number(latest);
      if (latestVersion !== body.base_version) return { kind: "stale", latest: latestVersion };

      const version = latestVersion + 1;
      await trx.insertInto("page_version").values({ ...values, page_id: id, version, created_by: userId }).execute();
      await trx.updateTable("page").set({ url: values.url }).where("id", "=", id).execute();
      return { kind: "saved", version };
    });
  } catch (e) {
    if (isUniqueViolation(e, "page_url_key")) return c.json({ error: URL_TAKEN }, 409);
    throw e;
  }

  if (outcome.kind === "missing") return c.json({ error: "Page not found" }, 404);
  if (outcome.kind === "stale") {
    return c.json(
      { error: `This page was saved by someone else (now version ${outcome.latest}). Reload to get their changes.`, latest_version: outcome.latest },
      409,
    );
  }
  return c.json({ version: outcome.version }, 201);
};

// ── PATCH /pages/{id} ───────────────────────────────────────────────────────

export const updatePageSettingsRoute = createRoute({
  method: "patch",
  path: "/pages/{id}",
  request: {
    params: IdParams,
    body: { content: { "application/json": { schema: PageSettingsSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ id: z.number(), visible: z.boolean(), nav_order: z.number().nullable() }) } },
      description: "Settings updated (no new version)",
    },
    400: badRequest,
    403: forbidden,
    404: notFound,
  },
});

export const updatePageSettingsHandler: RouteHandler<typeof updatePageSettingsRoute, AppEnv> = async (c) => {
  if (!await isRankingReporter(userIdOf(c))) return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  if (body.visible === undefined && body.nav_order === undefined) {
    return c.json({ error: "Nothing to update" }, 400);
  }

  const updated = await c.get("db")
    .updateTable("page")
    .set({
      ...(body.visible !== undefined && { visible: body.visible }),
      ...(body.nav_order !== undefined && { nav_order: body.nav_order }),
    })
    .where("id", "=", id)
    .returning(["id", "visible", "nav_order"])
    .executeTakeFirst();
  if (!updated) return c.json({ error: "Page not found" }, 404);
  return c.json(updated, 200);
};

// ── DELETE /pages/{id} ──────────────────────────────────────────────────────

export const deletePageRoute = createRoute({
  method: "delete",
  path: "/pages/{id}",
  request: { params: IdParams },
  responses: {
    200: { content: { "application/json": { schema: z.object({ success: z.literal(true) }) } }, description: "Page and all its versions deleted" },
    403: forbidden,
    404: notFound,
  },
});

export const deletePageHandler: RouteHandler<typeof deletePageRoute, AppEnv> = async (c) => {
  if (!await isRankingReporter(userIdOf(c))) return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.valid("param");
  const result = await c.get("db").deleteFrom("page").where("id", "=", id).executeTakeFirst();
  if (!result.numDeletedRows) return c.json({ error: "Page not found" }, 404);
  return c.json({ success: true as const }, 200);
};
