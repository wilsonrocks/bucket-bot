import { describe, expect, it } from "vitest";
import { isUkWorkingHours } from "./working-hours";

describe("isUkWorkingHours", () => {
  it.each([
    // GMT (winter): UK time equals UTC
    ["2026-01-14T08:59:00Z", false], // Wed 08:59
    ["2026-01-14T09:00:00Z", true], // Wed 09:00
    ["2026-01-14T17:29:00Z", true], // Wed 17:29
    ["2026-01-14T17:30:00Z", false], // Wed 17:30
    ["2026-01-17T12:00:00Z", false], // Sat
    ["2026-01-18T12:00:00Z", false], // Sun
    ["2026-01-19T09:30:00Z", true], // Mon
    ["2026-01-16T17:00:00Z", true], // Fri 17:00
    // BST (summer): UK time is UTC+1
    ["2026-07-15T08:00:00Z", true], // Wed 09:00 BST
    ["2026-07-15T07:59:00Z", false], // Wed 08:59 BST
    ["2026-07-15T16:30:00Z", false], // Wed 17:30 BST
    ["2026-07-15T16:29:00Z", true], // Wed 17:29 BST
    // Weekday boundary shifted by BST: Fri 23:30 UTC is Sat 00:30 UK
    ["2026-07-17T23:30:00Z", false],
    // Clocks go forward Sun 29 Mar 2026; Mon 30 Mar is BST
    ["2026-03-30T08:00:00Z", true],
    ["2026-03-27T08:00:00Z", false], // Fri 27 Mar still GMT → 08:00
  ])("%s → %s", (iso, expected) => {
    expect(isUkWorkingHours(new Date(iso))).toBe(expected);
  });
});
