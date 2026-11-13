import { describe, expect, test } from "vitest";
import { pickTopDogTitle, TOP_DOG_TITLES } from "./top-dog-titles";

describe("pickTopDogTitle", () => {
  const titles = ["A", "B", "C"];

  test("picks by the random value", () => {
    expect(pickTopDogTitle(titles, () => 0)).toBe("A");
    expect(pickTopDogTitle(titles, () => 0.5)).toBe("B");
    expect(pickTopDogTitle(titles, () => 0.999)).toBe("C");
  });

  test("falls back to Top Dog for an empty list", () => {
    expect(pickTopDogTitle([], () => 0)).toBe("Top Dog");
  });

  test("defaults to the hard-coded list", () => {
    expect(TOP_DOG_TITLES).toContain(pickTopDogTitle());
  });
});
