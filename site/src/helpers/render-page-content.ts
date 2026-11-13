// Server-only: imported from createServerFn handlers in #/queries so Tiptap
// stays out of the client bundle.
import Link from '@tiptap/extension-link'
import StarterKit from '@tiptap/starter-kit'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import type { JSONContent } from '@tiptap/core'

// The CMS page schema. Keep in step with admin/src/helpers/page-editor-extensions.ts
// and the backend allow-list (backend/logic/pages/content-schema.ts), which
// rejects anything else on save.
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    link: false,
  }),
  Link.configure({
    protocols: ['http', 'https', 'mailto'],
    HTMLAttributes: { target: null, rel: null },
  }),
]

/** Renders a saved (and backend-validated) ProseMirror document to HTML. Text is escaped by the renderer. */
export function renderPageContent(content: unknown): string {
  return renderToHTMLString({ content: content as JSONContent, extensions })
}
