import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import logger from "koa-logger";
import error from "koa-json-error";

import { v1Router } from "./routes/v1/v1-router";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
  // TODO unify and typescript this checking
}

const app = new Koa();
app.use(logger());
app.use(cors());
app.use(bodyParser());
app.use(
  error({
    format: (err: Error) => ({
      status: err?.status,
      message: err.message,
    }),
  })
);

app.use(v1Router.routes());
app.use(v1Router.allowedMethods());

export default app;
