import { z } from "zod";

// The ProseMirror document shape the CMS editor may produce. This must match the
// Tiptap extensions configured in admin/src/lib/page-editor-extensions.ts and
// site/src/helpers/page-extensions.ts — anything else is rejected on save.

const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/))/i;

const MarkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({ type: z.literal("underline") }),
  z.object({ type: z.literal("strike") }),
  z.object({
    type: z.literal("link"),
    attrs: z
      .object({
        href: z.string().regex(SAFE_HREF, "Links must start with http://, https://, mailto: or /"),
      })
      .passthrough(),
  }),
]);

const TextSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
  marks: z.array(MarkSchema).optional(),
});

const HardBreakSchema = z.object({ type: z.literal("hardBreak"), marks: z.array(MarkSchema).optional() });

const InlineSchema = z.union([TextSchema, HardBreakSchema]);

const inlineContent = z.array(InlineSchema).optional();

// Attribute objects are passthrough: Tiptap adds harmless attrs (e.g. textAlign: null)
// and the site renderer only emits attributes its own extensions know about.
const attrs = z.object({}).passthrough().optional();

type BlockNode = {
  type: string;
  attrs?: Record<string, unknown> | undefined;
  content?: unknown[] | undefined;
};

const BlockSchema: z.ZodType<BlockNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("paragraph"), attrs, content: inlineContent }),
    z.object({
      type: z.literal("heading"),
      attrs: z.object({ level: z.union([z.literal(2), z.literal(3), z.literal(4)]) }).passthrough(),
      content: inlineContent,
    }),
    z.object({ type: z.literal("blockquote"), attrs, content: z.array(BlockSchema).min(1) }),
    z.object({ type: z.literal("horizontalRule"), attrs }),
    z.object({ type: z.literal("bulletList"), attrs, content: z.array(ListItemSchema).min(1) }),
    z.object({ type: z.literal("orderedList"), attrs, content: z.array(ListItemSchema).min(1) }),
  ]),
);

const ListItemSchema = z.object({
  type: z.literal("listItem"),
  attrs,
  content: z.array(BlockSchema).min(1),
});

export const PageContentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(BlockSchema),
});

export type PageContent = z.infer<typeof PageContentSchema>;

/** Returns an error message describing the first problem, or null if the document is allowed. */
export function validatePageContent(content: unknown): string | null {
  const result = PageContentSchema.safeParse(content);
  if (result.success) return null;
  const issue = result.error.issues[0];
  if (!issue) return "Unsupported content";
  const path = issue.path.length ? ` (at ${issue.path.join(".")})` : "";
  return `Unsupported content${path}: ${issue.message}`;
}
