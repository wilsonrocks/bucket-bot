import serverless from "serverless-http";
import app from "./app.js";

process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

// this is it!
module.exports.handler = serverless(app);
