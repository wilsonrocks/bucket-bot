import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { searchSite, type SearchGroup } from '#/queries'
import { matchStaticPages } from '#/helpers/search-pages'

const MIN_LENGTH = 2
const DEBOUNCE_MS = 200

export function SiteSearch() {
  const router = useRouter()
  const listId = useId()
  const [text, setText] = useState('')
  const [dbGroups, setDbGroups] = useState<SearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const latestRequest = useRef(0)

  const trimmed = text.trim()
  const searching = trimmed.length >= MIN_LENGTH

  useEffect(() => {
    if (!searching) {
      setDbGroups([])
      setLoading(false)
      return
    }
    const request = ++latestRequest.current
    setLoading(true)
    const timer = setTimeout(() => {
      searchSite({ data: { text: trimmed } })
        .then((groups) => {
          if (request === latestRequest.current) setDbGroups(groups)
        })
        .catch(() => {
          if (request === latestRequest.current) setDbGroups([])
        })
        .finally(() => {
          if (request === latestRequest.current) setLoading(false)
        })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [trimmed, searching])

  const groups = useMemo<SearchGroup[]>(() => {
    if (!searching) return []
    const pages = matchStaticPages(trimmed)
    return pages.length > 0 ? [{ heading: 'Pages', results: pages }, ...dbGroups] : dbGroups
  }, [trimmed, searching, dbGroups])

  const flat = useMemo(() => groups.flatMap((g) => g.results), [groups])

  useEffect(() => setActive(-1), [flat])

  // Clear once a result (or any other link) has been followed.
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => setText(''), [pathname])

  const go = (href: string) => {
    setText('')
    void router.navigate({ href })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && flat.length > 0) {
      e.preventDefault()
      setActive((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp' && flat.length > 0) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? flat.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      const target = flat[active] ?? flat[0]
      if (target) {
        e.preventDefault()
        go(target.href)
      }
    } else if (e.key === 'Escape') {
      setText('')
    }
  }

  const optionId = (i: number) => `${listId}-option-${i}`
  let index = 0

  return (
    <div className="mb-3 w-full sm:w-56">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search…"
          aria-label="Search the site"
          role="combobox"
          aria-expanded={searching}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          className="w-full rounded border border-border bg-surface py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {searching && (
        <div id={listId} role="listbox" aria-label="Search results" className="mt-2 max-h-[60vh] overflow-y-auto rounded-md border border-border bg-muted p-1 text-sm shadow-sm">
          {groups.map((group) => (
            <div key={group.heading} role="group" aria-label={group.heading} className="mb-1 last:mb-0">
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.heading}
              </div>
              {group.results.map((result) => {
                const i = index++
                return (
                  <a
                    key={result.href}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    href={result.href}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                      e.preventDefault()
                      go(result.href)
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={`block rounded px-3 py-1.5 text-foreground no-underline ${
                      i === active ? 'bg-surface ring-1 ring-border' : 'hover:bg-surface'
                    }`}
                  >
                    <span className="block truncate">{result.label}</span>
                    {result.detail && (
                      <span className="block text-xs text-muted-foreground">{result.detail}</span>
                    )}
                  </a>
                )
              })}
            </div>
          ))}
          {groups.length === 0 && (
            <div className="px-3 py-1.5 text-muted-foreground">
              {loading ? 'Searching…' : 'No results'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
