import type { JwtVariables } from "hono/jwt";
import type { dbClient } from "./db-client";

export type AppEnv = {
  Variables: JwtVariables & {
    db: typeof dbClient;
  };
};
