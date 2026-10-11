import { afterEach, describe, expect, test, vi } from "vitest";
import { getSiteUrl } from "./site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  test("uses SITE_URL", () => {
    vi.stubEnv("SITE_URL", "http://localhost:3001");
    expect(getSiteUrl()).toBe("http://localhost:3001");
  });

  test("throws when SITE_URL is not set", () => {
    vi.stubEnv("SITE_URL", undefined);
    expect(() => getSiteUrl()).toThrow("SITE_URL is not defined");
  });
});
