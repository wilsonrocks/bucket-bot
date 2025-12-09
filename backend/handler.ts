import serverless from "serverless-http";
import app from "./app.js";

// this is it!
module.exports.handler = serverless(app);
