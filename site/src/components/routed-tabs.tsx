import { Tabs as OriginalTabs } from '@mantine/core'
import type { TabsProps } from '@mantine/core'
import { useRouter, useSearch } from '@tanstack/react-router'

type TabsComponentProps = Omit<
  TabsProps,
  'value' | 'onChange' | 'defaultValue'
> & {
  defaultValue: string
}

export function Tabs({ defaultValue, children, ...props }: TabsComponentProps) {
  const search = useSearch({ strict: false })
  const router = useRouter()

  const activeTab = search.tab ?? defaultValue

  return (
    <OriginalTabs
      {...props}
      value={activeTab}
      onChange={(value) => {
        const params = new URLSearchParams(router.state.location.searchStr)
        if (value !== null) params.set('tab', value)
        else params.delete('tab')
        const qs = params.size > 0 ? `?${params.toString()}` : ''
        router.history.replace(router.state.location.pathname + qs)
      }}
    >
      {children}
    </OriginalTabs>
  )
}

Tabs.List = OriginalTabs.List
Tabs.Tab = OriginalTabs.Tab
Tabs.Panel = OriginalTabs.Panel
