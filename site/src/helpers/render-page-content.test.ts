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

  // The backend only checks an href's prefix, so the renderer's own escaping
  // and attribute handling are what keep hostile values inert.
  describe('hostile attributes', () => {
    const linked = (attrs: object) => renderPageContent(doc(p(text('x', [{ type: 'link', attrs }]))))

    test('escapes quotes in href', () => {
      const html = linked({ href: 'https://a.example/" onmouseover="alert(1)' })
      expect(html).toBe('<p><a href="https://a.example/&quot; onmouseover=&quot;alert(1)">x</a></p>')
    })

    test('escapes other link attributes', () => {
      const html = linked({ href: '/', class: '" onclick="alert(1)', target: '"><script>alert(1)</script>' })
      expect(html).toBe(
        '<p><a target="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;" class="&quot; onclick=&quot;alert(1)" href="/">x</a></p>',
      )
    })

    test('blanks javascript: hrefs', () => {
      expect(linked({ href: 'javascript:alert(1)' })).toBe('<p><a href="">x</a></p>')
    })

    test('drops attributes the schema does not define', () => {
      expect(linked({ href: '/', onclick: 'alert(1)' })).toBe('<p><a href="/">x</a></p>')
      const html = renderPageContent(
        doc({ type: 'paragraph', attrs: { style: 'x', onclick: 'y' }, content: [text('p')] }),
      )
      expect(html).toBe('<p>p</p>')
    })
  })
})
