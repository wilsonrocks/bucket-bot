import { describe, expect, test } from "vitest";
import { missingEnvVars, REQUIRED_ENV_VARS } from "./check-env";

const allSet = Object.fromEntries(REQUIRED_ENV_VARS.map((name) => [name, "x"]));

describe("missingEnvVars", () => {
  test("nothing missing when every required var is set", () => {
    expect(missingEnvVars(allSet)).toEqual([]);
  });

  test("lists unset and empty vars", () => {
    expect(
      missingEnvVars({ ...allSet, SITE_URL: undefined, JWT_SECRET: "" }),
    ).toEqual(["JWT_SECRET", "SITE_URL"]);
  });
});
