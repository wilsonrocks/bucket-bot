import type { Kysely } from "kysely";
import type { DB } from "./db.generated";
import { dbClient } from "./db-client";

declare module "koa" {
  interface DefaultState {
    db: typeof dbClient;
  }
}
