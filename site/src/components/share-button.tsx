import { useEffect, useState } from 'react'
import { Check, Share2 } from 'lucide-react'

/**
 * Opens the OS share sheet via the Web Share API. Where that isn't supported
 * (e.g. desktop Firefox) the link is copied to the clipboard instead.
 *
 * With `imageUrl`, devices that can share files (mostly phones) share the
 * image itself — so it lands in Instagram/WhatsApp as a picture — with the
 * text and link alongside. Anything that goes wrong fetching the image falls
 * back to sharing the link.
 */
export function ShareButton({
  url,
  title,
  text,
  imageUrl,
  label = 'Share',
  className = '',
}: {
  url: string
  title: string
  text?: string
  imageUrl?: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  // Fetched ahead of the click: Safari only allows navigator.share() close to
  // the tap, so there's no time to download the image after it.
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    setFile(null)
    if (!imageUrl || typeof navigator.canShare !== 'function') return
    let cancelled = false
    fetchImageFile(imageUrl).then((f) => {
      if (!cancelled && f && navigator.canShare({ files: [f] })) setFile(f)
    })
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  async function share(e: React.MouseEvent) {
    e.stopPropagation()
    if (typeof navigator.share === 'function') {
      try {
        if (file) {
          // The link goes in the text: some targets drop files when `url` is set.
          await navigator.share({ title, text: [text, url].filter(Boolean).join(' '), files: [file] })
        } else {
          await navigator.share({ title, text, url })
        }
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
      <span aria-live="polite">{copied ? 'Link copied' : label}</span>
    </button>
  )
}

async function fetchImageFile(imageUrl: string): Promise<File | null> {
  try {
    const res = await fetch(imageUrl, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const name = imageUrl.split('/').pop()?.split('?')[0] || 'image.png'
    return new File([blob], name, { type: blob.type || 'image/png' })
  } catch {
    return null
  }
}
