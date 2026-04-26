import { useGetFeatureFlags, usePatchFeatureFlag } from '@/api/hooks'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Switch, Table } from '@mantine/core'
import { modals } from '@mantine/modals'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_app-pages/feature-flags')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: { title: 'Feature Flags' },
})

function RouteComponent() {
  const { data: flags } = useGetFeatureFlags()
  const patchFlag = usePatchFeatureFlag()

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Flag</Table.Th>
          <Table.Th>Enabled</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {flags?.map((flag) => (
          <Table.Tr key={flag.flag}>
            <Table.Td>{flag.flag}</Table.Td>
            <Table.Td>
              <Switch
                checked={flag.is_enabled}
                onChange={(e) => {
                  const newValue = e.currentTarget.checked
                  modals.openConfirmModal({
                    title: 'Toggle feature flag',
                    centered: true,
                    labels: {
                      confirm: newValue ? 'Enable' : 'Disable',
                      cancel: 'Cancel',
                    },
                    confirmProps: { color: newValue ? 'green' : 'red' },
                    children: `Are you sure you want to ${newValue ? 'enable' : 'disable'} "${flag.flag}"?`,
                    onConfirm: () =>
                      patchFlag.mutate({ flag: flag.flag, is_enabled: newValue }),
                  })
                }}
              />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}
