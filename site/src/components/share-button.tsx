import { useEffect, useState } from 'react'
import { Check, Download, Image as ImageIcon, Share2 } from 'lucide-react'

const BUTTON_CLASS = 'inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-sm hover:bg-muted'

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError'

/**
 * Shares a link via the OS share sheet (Web Share API), where apps show it
 * with its link preview. Where that isn't supported (e.g. desktop Firefox)
 * the link is copied to the clipboard instead.
 */
export function ShareButton({
  url,
  title,
  text,
  label = 'Share',
  className = '',
}: {
  url: string
  title: string
  text?: string
  label?: string
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
        if (!isAbort(err)) throw err
      }
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <button type="button" onClick={share} className={`${BUTTON_CLASS} ${className}`}>
      {copied ? <Check size={14} aria-hidden /> : <Share2 size={14} aria-hidden />}
      <span aria-live="polite">{copied ? 'Link copied' : label}</span>
    </button>
  )
}

/**
 * Shares an image file itself, so it lands in Instagram, WhatsApp, Messages
 * etc. as a picture. Only the file is shared — apps treat text and links
 * alongside a file inconsistently (Instagram drops them), so the link has its
 * own ShareButton.
 *
 * Where files can't be shared (most desktops) it's a download instead. Either
 * way the file gets `fileName` rather than whatever the image URL is called.
 */
export function ShareImageButton({
  imageUrl,
  fileName,
  title,
  className = '',
}: {
  imageUrl: string
  fileName: string
  title: string
  className?: string
}) {
  // Fetched ahead of the tap: Safari only allows navigator.share() right
  // after one, so there's no time to download the image afterwards.
  const [file, setFile] = useState<File | null>(null)
  const [canShareFile, setCanShareFile] = useState(false)

  useEffect(() => {
    setFile(null)
    setCanShareFile(false)
    let cancelled = false
    fetchImageFile(imageUrl, fileName).then((f) => {
      if (cancelled || !f) return
      setFile(f)
      setCanShareFile(typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] }))
    })
    return () => {
      cancelled = true
    }
  }, [imageUrl, fileName])

  async function share(e: React.MouseEvent) {
    e.stopPropagation()
    if (!file) return
    try {
      await navigator.share({ title, files: [file] })
    } catch (err) {
      if (!isAbort(err)) throw err
    }
  }

  if (file && canShareFile) {
    return (
      <button type="button" onClick={share} className={`${BUTTON_CLASS} ${className}`}>
        <ImageIcon size={14} aria-hidden />
        Share image
      </button>
    )
  }

  // A cross-origin <a download> ignores the name, so download the fetched copy
  // where we have one, and fall back to opening the image.
  return (
    <a
      href={imageUrl}
      download={fileName}
      target="_blank"
      rel="noopener"
      onClick={(e) => {
        e.stopPropagation()
        if (!file) return
        e.preventDefault()
        downloadFile(file)
      }}
      className={`${BUTTON_CLASS} ${className}`}
    >
      <Download size={14} aria-hidden />
      Save image
    </a>
  )
}

async function fetchImageFile(imageUrl: string, fileName: string): Promise<File | null> {
  try {
    const res = await fetch(imageUrl, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return new File([blob], fileName, { type: blob.type || 'image/png' })
  } catch {
    return null
  }
}

function downloadFile(file: File) {
  const href = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = href
  a.download = file.name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

/** A readable file name: `Oli Hedges`, 2026, `EVENTS_WON` → `oli-hedges-malifaux-buried-2026-events-won.png`. */
export function shareFileName(...parts: (string | number)[]): string {
  const slug = parts
    .map((p) => String(p))
    .join('-')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'image'}.png`
}
