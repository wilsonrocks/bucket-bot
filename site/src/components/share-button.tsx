import { useEffect, useState } from 'react'
import { Check, Share2 } from 'lucide-react'

/**
 * Opens the OS share sheet via the Web Share API. Where that isn't supported
 * (e.g. desktop Firefox) the link is copied to the clipboard instead.
 */
export function ShareButton({
  url,
  title,
  text,
  className = '',
}: {
  url: string
  title: string
  text?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  async function share(e: React.MouseEvent) {
    e.stopPropagation()
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
      } catch (err) {
        // AbortError means the user dismissed the share sheet.
        if (!(err instanceof DOMException && err.name === 'AbortError')) throw err
      }
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-sm hover:bg-muted ${className}`}
    >
      {copied ? <Check size={14} aria-hidden /> : <Share2 size={14} aria-hidden />}
      <span aria-live="polite">{copied ? 'Link copied' : 'Share'}</span>
    </button>
  )
}
