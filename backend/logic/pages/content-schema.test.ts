import { describe, expect, test } from "vitest";
import { validatePageContent } from "./content-schema";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const text = (t: string, marks?: unknown[]) => ({ type: "text", text: t, ...(marks && { marks }) });
const link = (href: string) => ({ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer nofollow", class: null } });

describe("validatePageContent", () => {
  test("accepts every supported node and mark", () => {
    const content = doc(
      { type: "heading", attrs: { level: 2 }, content: [text("Title")] },
      p(
        text("plain "),
        text("bold", [{ type: "bold" }, { type: "italic" }, { type: "underline" }, { type: "strike" }]),
        { type: "hardBreak" },
        text("site", [link("/rankings")]),
        text("ext", [link("https://example.com")]),
        text("mail", [link("mailto:a@example.com")]),
      ),
      { type: "paragraph" },
      { type: "bulletList", content: [{ type: "listItem", content: [p(text("a"))] }] },
      { type: "orderedList", attrs: { start: 1, type: null }, content: [{ type: "listItem", content: [p(text("b"))] }] },
      { type: "blockquote", content: [p(text("quote"))] },
      { type: "horizontalRule" },
    );
    expect(validatePageContent(content)).toBeNull();
  });

  test("accepts an empty document", () => {
    expect(validatePageContent(doc())).toBeNull();
  });

  test.each(["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,x", "//evil.example", "evil.example"])(
    "rejects link href %s",
    (href) => {
      expect(validatePageContent(doc(p(text("x", [link(href)]))))).toMatch(/Links must start with/);
    },
  );

  test.each([
    ["h1", { type: "heading", attrs: { level: 1 }, content: [text("x")] }],
    ["image", { type: "image", attrs: { src: "https://example.com/x.png" } }],
    ["code block", { type: "codeBlock", content: [text("x")] }],
  ])("rejects %s", (_name, node) => {
    expect(validatePageContent(doc(node))).not.toBeNull();
  });

  test("rejects unknown marks", () => {
    expect(validatePageContent(doc(p(text("x", [{ type: "code" }]))))).not.toBeNull();
  });

  test("rejects things that aren't documents", () => {
    expect(validatePageContent(null)).not.toBeNull();
    expect(validatePageContent({ type: "paragraph" })).not.toBeNull();
  });
});
