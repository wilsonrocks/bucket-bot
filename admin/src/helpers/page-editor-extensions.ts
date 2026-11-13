import { Link } from '@mantine/tiptap'
import StarterKit from '@tiptap/starter-kit'

// The CMS page schema. Keep in step with the backend allow-list
// (backend/logic/pages/content-schema.ts) and the site renderer
// (site/src/helpers/page-extensions.ts) — saves using anything else are rejected.
export const pageEditorExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    // Mantine's Link adds the Mod+K shortcut its link control uses.
    link: false,
  }),
  Link.configure({
    openOnClick: false,
    protocols: ['http', 'https', 'mailto'],
    // Same-tab links: no target, so no rel needed.
    HTMLAttributes: { target: null, rel: null },
  }),
]
