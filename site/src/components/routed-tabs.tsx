import * as RadixTabs from '@radix-ui/react-tabs'
import { useRouter, useSearch } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type TabsProps = {
  defaultValue: string
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const search = useSearch({ strict: false })
  const router = useRouter()

  const activeTab = (search as { tab?: string }).tab ?? defaultValue

  return (
    <RadixTabs.Root
      value={activeTab}
      onValueChange={(value) => {
        const params = new URLSearchParams(router.state.location.searchStr)
        if (value !== null) params.set('tab', value)
        else params.delete('tab')
        const qs = params.size > 0 ? `?${params.toString()}` : ''
        router.history.replace(router.state.location.pathname + qs)
      }}
      className={className}
    >
      {children}
    </RadixTabs.Root>
  )
}

type ListProps = {
  children: ReactNode
  className?: string
  mb?: string
}

function List({ children, className = '', mb }: ListProps) {
  const mbClass = mb === 'md' ? 'mb-4' : mb === 'sm' ? 'mb-2' : mb === 'lg' ? 'mb-6' : ''
  return (
    <RadixTabs.List className={`flex border-b border-border ${mbClass} ${className}`}>
      {children}
    </RadixTabs.List>
  )
}

type TabProps = {
  value: string
  children: ReactNode
  className?: string
}

function Tab({ value, children, className = '' }: TabProps) {
  return (
    <RadixTabs.Trigger
      value={value}
      className={`-mb-px border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground hover:text-foreground data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 dark:data-[state=active]:border-blue-400 dark:data-[state=active]:text-blue-300 data-[state=active]:font-medium ${className}`}
    >
      {children}
    </RadixTabs.Trigger>
  )
}

type PanelProps = {
  value: string
  children: ReactNode
  className?: string
}

function Panel({ value, children, className = '' }: PanelProps) {
  return (
    <RadixTabs.Content value={value} className={`pt-4 ${className}`}>
      {children}
    </RadixTabs.Content>
  )
}

Tabs.List = List
Tabs.Tab = Tab
Tabs.Panel = Panel
