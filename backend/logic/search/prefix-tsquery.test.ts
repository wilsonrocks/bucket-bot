import { describe, expect, test } from "vitest";
import { prefixTsquery } from "./prefix-tsquery";

describe("prefixTsquery", () => {
  test("makes each word a prefix match", () => {
    expect(prefixTsquery("rad")).toBe("rad:*");
    expect(prefixTsquery("Radek Smith")).toBe("radek:* & smith:*");
  });

  test("drops brackets and other punctuation", () => {
    expect(prefixTsquery("Radek (washed")).toBe("radek:* & washed:*");
    expect(prefixTsquery("Jaye (she/they)")).toBe("jaye:* & she:* & they:*");
  });

  test("strips tsquery operators rather than passing them through", () => {
    expect(prefixTsquery("a & !b | c:* <-> 'd'")).toBe("a:* & b:* & c:* & d:*");
  });

  test("keeps digits and non-ASCII letters", () => {
    expect(prefixTsquery("kedar69")).toBe("kedar69:*");
    expect(prefixTsquery("Łukasz Müller")).toBe("łukasz:* & müller:*");
  });

  test("returns null when there is nothing to search for", () => {
    expect(prefixTsquery("")).toBeNull();
    expect(prefixTsquery("   ")).toBeNull();
    expect(prefixTsquery("()[]")).toBeNull();
  });
});
