import { useGetPages, useUpdatePageSettings } from '@/api/hooks'
import type { GetPages200Item } from '@/api/hooks'
import { Link } from '@/components/link'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { SortableTh, useTableSort } from '@/components/sortable-table'
import { Anchor, Button, Group, Switch, Table, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { SITE_URL } from '@/helpers/site-url'


export const Route = createFileRoute('/_app/pages/')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: { title: 'Pages' },
})

function RouteComponent() {
  const { data: pages } = useGetPages()
  const { rows, getSortProps } = useTableSort(pages ?? [], {
    url: { value: (p) => p.url },
    title: { value: (p) => p.title },
    visible: { value: (p) => p.visible, natural: 'desc' },
    nav: { value: (p) => p.nav_order },
    updated: { value: (p) => p.updated_at, natural: 'desc' },
  })

  return (
    <div>
      <Group mb="md" justify="space-between">
        <Text size="sm" c="dimmed">
          Content pages on malifaux.uk. Every save keeps the previous version in
          the page's history.
        </Text>
        <Button component={Link} to="/pages/new">
          New page
        </Button>
      </Group>
      {pages && pages.length === 0 ? (
        <Text c="dimmed">No pages yet.</Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <SortableTh {...getSortProps('url')}>URL</SortableTh>
              <SortableTh {...getSortProps('title')}>Title</SortableTh>
              <SortableTh {...getSortProps('visible')}>Visible</SortableTh>
              <SortableTh {...getSortProps('nav')}>Nav order</SortableTh>
              <SortableTh {...getSortProps('updated')}>Last saved</SortableTh>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((page) => (
              <PageRow key={page.id} page={page} />
            ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  )
}

function PageRow({ page }: { page: GetPages200Item }) {
  const updateSettings = useUpdatePageSettings(page.id)
  return (
    <Table.Tr>
      <Table.Td>
        <Anchor href={`${SITE_URL}${page.url}`} target="_blank" size="sm">
          {page.url}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Link to="/pages/$id" params={{ id: String(page.id) }}>
          {page.title}
        </Link>
      </Table.Td>
      <Table.Td>
        <Switch
          checked={page.visible}
          disabled={updateSettings.isPending}
          onChange={(e) =>
            updateSettings.mutate({
              id: page.id,
              data: { visible: e.currentTarget.checked },
            })
          }
        />
      </Table.Td>
      <Table.Td>{page.nav_order ?? '—'}</Table.Td>
      <Table.Td>
        {format(parseISO(page.updated_at), 'd MMM yyyy HH:mm')} (v{page.version}
        )
      </Table.Td>
    </Table.Tr>
  )
}
