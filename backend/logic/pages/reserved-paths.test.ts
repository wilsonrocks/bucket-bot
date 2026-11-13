import { describe, expect, test } from "vitest";
import { normaliseUrl, validatePageUrl } from "./reserved-paths";

describe("normaliseUrl", () => {
  test.each([
    ["guides/new-players", "/guides/new-players"],
    ["  /guides/  ", "/guides"],
    ["///about//", "/about"],
    ["", "/"],
    ["/About", "/About"],
  ])("%j → %j", (input, expected) => {
    expect(normaliseUrl(input)).toBe(expected);
  });
});

describe("validatePageUrl", () => {
  test.each(["/about", "/guides/new-players", "/faq-2026", "/a/b/c"])("accepts %s", (url) => {
    expect(validatePageUrl(url)).toBeNull();
  });

  test("rejects the homepage", () => {
    expect(validatePageUrl("/")).toMatch(/homepage/);
  });

  test.each(["/About", "/a_b", "/a--b", "/-a", "/a-", "/a//b", "/a b", "/café"])("rejects bad slug %s", (url) => {
    expect(validatePageUrl(url)).toMatch(/lowercase/);
  });

  test.each(["/teams", "/teams/foo", "/player", "/events/2026"])("rejects reserved %s", (url) => {
    expect(validatePageUrl(url)).toMatch(/already used by the site/);
  });

  test("allows pages that merely start with a reserved word", () => {
    expect(validatePageUrl("/teams-guide")).toBeNull();
  });
});
