import {
  useDeletePage,
  useGetPage,
  useGetPageVersion,
  useGetPageVersions,
  useSavePageVersion,
  useUpdatePageSettings,
} from '@/api/hooks'
import type { GetPagesId200 } from '@/api/hooks'
import { PageContentPreview, PageForm } from '@/components/page-form'
import type { PageFormValues } from '@/components/page-form'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import {
  Alert,
  Anchor,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { SITE_URL } from '@/helpers/site-url'

export const Route = createFileRoute('/_app/pages/$id')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: { title: 'Edit Page' },
})

const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy HH:mm')

function RouteComponent() {
  const id = Number(Route.useParams().id)
  const { data: page, refetch } = useGetPage(id)

  if (!page) return <Loader />

  return (
    <Stack>
      <PageSettings page={page} />
      <Tabs defaultValue="edit" keepMounted>
        <Tabs.List mb="md">
          <Tabs.Tab value="edit">Edit</Tabs.Tab>
          <Tabs.Tab value="history">History</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="edit">
          {/* Remount on each new version so the form and editor start from what was saved. */}
          <EditPanel
            key={page.latest.version}
            page={page}
            reload={() => void refetch()}
          />
        </Tabs.Panel>
        <Tabs.Panel value="history">
          <HistoryPanel page={page} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

/** Visibility, nav order and deletion — these apply immediately and don't create a version. */
function PageSettings({ page }: { page: GetPagesId200 }) {
  const updateSettings = useUpdatePageSettings(page.id)
  const deletePage = useDeletePage()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(page.visible)
  const [navOrder, setNavOrder] = useState<number | null>(page.nav_order)

  const save = (data: { visible?: boolean; nav_order?: number | null }) =>
    updateSettings.mutate(
      { id: page.id, data },
      {
        onSuccess: (res) => {
          if (res.status !== 200) return
          setVisible(res.data.visible)
          setNavOrder(res.data.nav_order)
        },
      },
    )

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" align="end">
        <Group align="end">
          <Switch
            label="Visible on the site"
            checked={visible}
            disabled={updateSettings.isPending}
            onChange={(e) => save({ visible: e.currentTarget.checked })}
          />
          <NumberInput
            label="Nav order"
            description="Empty = not in the site menu"
            allowDecimal={false}
            defaultValue={navOrder ?? ''}
            key={navOrder ?? 'none'}
            onBlur={(e) => {
              const raw = e.currentTarget.value.trim()
              const next = raw === '' ? null : Number(raw)
              if (
                next !== navOrder &&
                (next === null || Number.isInteger(next))
              )
                save({ nav_order: next })
            }}
            w={200}
          />
          <Anchor
            href={`${SITE_URL}${page.latest.url}`}
            target="_blank"
            size="sm"
          >
            View on site ↗
          </Anchor>
        </Group>
        <Button
          color="red"
          variant="light"
          loading={deletePage.isPending}
          onClick={() =>
            modals.openConfirmModal({
              title: 'Delete page',
              centered: true,
              children: `Permanently delete ${page.latest.url} and all ${page.latest.version} of its versions? To take it off the site but keep it, switch off "Visible" instead.`,
              labels: { confirm: 'Delete', cancel: 'Cancel' },
              confirmProps: { color: 'red' },
              onConfirm: () =>
                deletePage.mutate(
                  { id: page.id },
                  { onSuccess: () => navigate({ to: '/pages' }) },
                ),
            })
          }
        >
          Delete
        </Button>
      </Group>
    </Paper>
  )
}

function EditPanel({
  page,
  reload,
}: {
  page: GetPagesId200
  reload: () => void
}) {
  const savePage = useSavePageVersion(page.id)
  const [failed, setFailed] = useState(false)
  const { latest } = page

  return (
    <Stack>
      {failed && (
        <Alert color="orange" title="Not saved">
          <Stack gap="xs">
            <Text size="sm">
              If someone else has saved this page since you opened it, reload to
              get their version. Reloading discards your edits, so copy anything
              you want to keep first.
            </Text>
            <Group>
              <Button size="xs" variant="light" onClick={reload}>
                Reload latest version
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}
      <PageForm
        initialValues={{
          url: latest.url,
          title: latest.title,
          description: latest.description,
          content: latest.content as PageFormValues['content'],
        }}
        submitLabel={`Save as version ${latest.version + 1}`}
        submitting={savePage.isPending}
        onSubmit={async (values) => {
          setFailed(false)
          try {
            await savePage.mutateAsync({
              id: page.id,
              data: { ...values, base_version: latest.version },
            })
          } catch (e) {
            setFailed(true)
            throw e
          }
        }}
      />
    </Stack>
  )
}

function HistoryPanel({ page }: { page: GetPagesId200 }) {
  const { data: versions } = useGetPageVersions(page.id)
  const [viewing, setViewing] = useState<number | null>(null)

  return (
    <>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Version</Table.Th>
            <Table.Th>Saved</Table.Th>
            <Table.Th>By</Table.Th>
            <Table.Th>URL</Table.Th>
            <Table.Th>Title</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {versions?.map((v) => (
            <Table.Tr
              key={v.version}
              style={{ cursor: 'pointer' }}
              onClick={() => setViewing(v.version)}
            >
              <Table.Td>
                v{v.version}
                {v.version === page.latest.version && ' (live)'}
              </Table.Td>
              <Table.Td>{formatDate(v.created_at)}</Table.Td>
              <Table.Td>{v.author_name ?? v.created_by ?? 'System'}</Table.Td>
              <Table.Td>{v.url}</Table.Td>
              <Table.Td>{v.title}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <VersionModal
        page={page}
        version={viewing}
        onClose={() => setViewing(null)}
      />
    </>
  )
}

function VersionModal({
  page,
  version,
  onClose,
}: {
  page: GetPagesId200
  version: number | null
  onClose: () => void
}) {
  const { data } = useGetPageVersion(page.id, version)
  const savePage = useSavePageVersion(page.id)
  const isLive = version === page.latest.version

  return (
    <Modal
      opened={version !== null}
      onClose={onClose}
      size="xl"
      title={version !== null ? `Version ${version}` : ''}
    >
      {!data || data.version !== version ? (
        <Loader />
      ) : (
        <Stack>
          <Text size="sm" c="dimmed">
            Saved {formatDate(data.created_at)} by{' '}
            {data.author_name ?? data.created_by ?? 'System'} · {data.url}
          </Text>
          <Title order={2}>{data.title}</Title>
          {data.description && (
            <Text size="sm" c="dimmed">
              Description: {data.description}
            </Text>
          )}
          <PageContentPreview
            content={data.content as PageFormValues['content']}
          />
          {!isLive && (
            <Group>
              <Button
                loading={savePage.isPending}
                onClick={() =>
                  modals.openConfirmModal({
                    title: `Restore version ${data.version}`,
                    centered: true,
                    children: `This saves a copy of version ${data.version} as version ${page.latest.version + 1}, which goes live straight away. Any unsaved edits in the Edit tab will be lost.`,
                    labels: { confirm: 'Restore', cancel: 'Cancel' },
                    onConfirm: () =>
                      savePage.mutate(
                        {
                          id: page.id,
                          data: {
                            url: data.url,
                            title: data.title,
                            description: data.description,
                            content: data.content,
                            base_version: page.latest.version,
                          },
                        },
                        { onSuccess: onClose },
                      ),
                  })
                }
              >
                Restore this version
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  )
}
