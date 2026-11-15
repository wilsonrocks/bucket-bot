import { describe, expect, test } from "vitest";
import { organiserShoutOut } from "./organiser-shout-out";

describe("organiserShoutOut", () => {
  test("nothing without organisers", () => {
    expect(organiserShoutOut([])).toBe("");
  });

  test("one organiser", () => {
    expect(organiserShoutOut(["1"])).toBe("\n\nShout out to <@1> for organising it! ❤️");
  });

  test("two organisers joined with and", () => {
    expect(organiserShoutOut(["1", "2"])).toBe(
      "\n\nShout out to <@1> and <@2> for organising it! ❤️",
    );
  });

  test("three or more organisers listed with commas", () => {
    expect(organiserShoutOut(["1", "2", "3"])).toBe(
      "\n\nShout out to <@1>, <@2> and <@3> for organising it! ❤️",
    );
  });
});
