import { useCreatePage } from '@/api/hooks'
import { EMPTY_PAGE, PageForm } from '@/components/page-form'
import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { Group, NumberInput, Switch } from '@mantine/core'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_app/pages/new')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: { title: 'New Page' },
})

function RouteComponent() {
  const createPage = useCreatePage()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(true)
  const [navOrder, setNavOrder] = useState<number | null>(null)

  return (
    <PageForm
      initialValues={EMPTY_PAGE}
      submitLabel="Create page"
      submitting={createPage.isPending}
      onSubmit={async (values) => {
        const res = await createPage.mutateAsync({
          data: { ...values, visible, nav_order: navOrder },
        })
        if (res.status === 201) {
          navigate({ to: '/pages/$id', params: { id: String(res.data.id) } })
        }
      }}
    >
      <Group>
        <Switch
          label="Visible on the site"
          checked={visible}
          onChange={(e) => setVisible(e.currentTarget.checked)}
        />
        <NumberInput
          label="Nav order"
          description="Leave empty to keep it out of the site menu"
          allowDecimal={false}
          value={navOrder ?? ''}
          onChange={(v) => setNavOrder(typeof v === 'number' ? v : null)}
          w={260}
        />
      </Group>
    </PageForm>
  )
}
