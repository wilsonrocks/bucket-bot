import { Link, useMatchRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type AppNavLinkProps = {
  to: string
  label: ReactNode
  icon?: ReactNode
  fuzzy?: boolean
  children?: ReactNode
}

export function AppNavLink({ to, label, icon, fuzzy = true, children }: AppNavLinkProps) {
  const matchRoute = useMatchRoute()
  const active = !!matchRoute({ to, fuzzy })
  return (
    <div>
      <Link
        from="/"
        to={to}
        className={`flex items-center gap-2 rounded px-3 py-2 text-sm no-underline ${
          active
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium'
            : 'text-foreground hover:bg-muted'
        }`}
      >
        {icon && <span className="inline-flex h-5 w-5 items-center justify-center">{icon}</span>}
        <span>{label}</span>
      </Link>
      {children && <div className="ml-6">{children}</div>}
    </div>
  )
}
