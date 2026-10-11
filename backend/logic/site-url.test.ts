import { afterEach, describe, expect, test, vi } from "vitest";
import { getSiteUrl } from "./site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  test("uses SITE_URL when set", () => {
    vi.stubEnv("SITE_URL", "http://localhost:3001");
    expect(getSiteUrl()).toBe("http://localhost:3001");
  });

  test("falls back to the production site", () => {
    vi.stubEnv("SITE_URL", undefined);
    expect(getSiteUrl()).toBe("https://malifaux.uk");
  });
});
