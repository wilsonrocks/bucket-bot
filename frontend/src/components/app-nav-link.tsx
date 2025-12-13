// AppNavLink.tsx
import { NavLink } from '@mantine/core'
import { Link, useMatchRoute } from '@tanstack/react-router'
import type React from 'react'
import type { ReactNode } from 'react'

type AppNavLinkProps = {
  to: string
  label: ReactNode
  icon?: ReactNode
  fuzzy?: boolean
  children?: ReactNode
} & Omit<
  React.ComponentProps<typeof NavLink>,
  'component' | 'to' | 'label' | 'active'
>

export function AppNavLink({
  to,
  label,
  icon,
  fuzzy = true,
  children,
  ...props
}: AppNavLinkProps) {
  const matchRoute = useMatchRoute()

  const active = !!matchRoute({
    to,
    fuzzy,
  })

  return (
    <NavLink
      from="/"
      component={Link}
      to={to}
      label={label}
      leftSection={icon}
      active={active}
      {...props}
    >
      {children}
    </NavLink>
  )
}
