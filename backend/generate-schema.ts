import { resolve } from "path";
import { writeFileSync } from "fs";
import app from "./app";

async function main() {
  const res = await app.request("/v1/doc");
  const spec = await res.json();
  const outPath = resolve(__dirname, "../openapi.json");
  writeFileSync(outPath, JSON.stringify(spec, null, 2));
  console.log(`OpenAPI schema written to ${outPath}`);
}

main();
