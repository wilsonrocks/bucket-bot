import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import logger from "koa-logger";
import error from "koa-json-error";

import { v1Router } from "./routes/v1/v1-router.js";

const app = new Koa();
app.use(cors());
app.use(
  error({
    format: (err: any) => {
      console.error(err);
      return {
        status: err?.status,
        message: err.message,
      };
    },
  })
);
app.use(logger());
app.use(bodyParser());

app.use(v1Router.routes());
app.use(v1Router.allowedMethods());

export default app;
