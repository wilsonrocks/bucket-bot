import { describe, expect, test } from 'vitest'
import { renderPageContent } from './render-page-content'

const doc = (...content: unknown[]) => ({ type: 'doc', content })
const p = (...content: unknown[]) => ({ type: 'paragraph', content })
const text = (t: string, marks?: unknown[]) => ({ type: 'text', text: t, ...(marks && { marks }) })

describe('renderPageContent', () => {
  test('renders headings, lists and marks', () => {
    const html = renderPageContent(
      doc(
        { type: 'heading', attrs: { level: 2 }, content: [text('Points')] },
        p(text('The '), text('5+ events only', [{ type: 'bold' }]), text(' box')),
        { type: 'bulletList', content: [{ type: 'listItem', content: [p(text('3 rounds'))] }] },
      ),
    )
    expect(html).toContain('<h2>Points</h2>')
    expect(html).toContain('<strong>5+ events only</strong>')
    expect(html).toMatch(/<ul><li><p>3 rounds<\/p><\/li><\/ul>/)
  })

  test('renders same-tab links without target or rel', () => {
    const html = renderPageContent(
      doc(p(text('rankings', [{ type: 'link', attrs: { href: '/rankings', target: null, rel: null } }]))),
    )
    expect(html).toContain('<a href="/rankings">rankings</a>')
  })

  test('escapes HTML in text', () => {
    const html = renderPageContent(doc(p(text('<script>alert(1)</script> & "q"'))))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
