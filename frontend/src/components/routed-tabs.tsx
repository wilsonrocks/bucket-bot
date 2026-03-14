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
        const searchParams = new URLSearchParams(router.state.location.search)
        if (value != null) searchParams.set('tab', value)
        else searchParams.delete('tab')
        void router.navigate({
          to: router.state.location.pathname,
          search: Object.fromEntries(searchParams) as Record<string, string>,
          replace: true,
        })
      }}
    >
      {children}
    </OriginalTabs>
  )
}

Tabs.List = OriginalTabs.List
Tabs.Tab = OriginalTabs.Tab
Tabs.Panel = OriginalTabs.Panel
