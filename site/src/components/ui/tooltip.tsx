import type { ReactNode } from 'react'

// CSS-only tooltip. Replaces @radix-ui/react-tooltip (which dragged in
// @floating-ui + @radix-ui/react-popper, ~34KB) — all usages just show a short
// text label on hover, so collision-aware positioning isn't needed.
const SIDE_CLASSES: Record<'top' | 'right' | 'bottom' | 'left', string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1',
}

export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-md group-hover/tooltip:block group-focus-within/tooltip:block dark:bg-gray-700 ${SIDE_CLASSES[side]}`}
      >
        {label}
      </span>
    </span>
  )
}
