import { RequireRankingReporter } from '@/components/RequireRankingReporter'
import { createFileRoute } from '@tanstack/react-router'
import {
  useGetPipelineJobSteps,
  usePostRetryPipelineSteps,
  usePostRunRankingsPipeline,
  type GetPipelineJobSteps200Item,
} from '@/api/hooks'
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'

export const Route = createFileRoute('/_app/rankings/runs')({
  component: () => (
    <RequireRankingReporter>
      <RouteComponent />
    </RequireRankingReporter>
  ),
  staticData: {
    title: 'Pipeline Runs',
  },
})

type Step = GetPipelineJobSteps200Item

const STATUS_COLOR: Record<string, string> = {
  success: 'green',
  failed: 'red',
  skipped: 'gray',
  running: 'blue',
}

function statusColor(status: string) {
  return STATUS_COLOR[status] ?? 'gray'
}

function formatTime(ts: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

function duration(step: Step) {
  if (!step.finished_at) return '—'
  const ms = new Date(step.finished_at).getTime() - new Date(step.started_at).getTime()
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/** Group steps into runs (rows arrive newest-first, ordered by started_at). */
function groupRuns(steps: Step[]) {
  const byRun = new Map<string, Step[]>()
  for (const step of steps) {
    const existing = byRun.get(step.run_id)
    if (existing) existing.push(step)
    else byRun.set(step.run_id, [step])
  }
  return [...byRun.entries()].map(([runId, runSteps]) => {
    const sorted = [...runSteps].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    )
    const failedOrSkipped = sorted.filter(
      (s) => s.status === 'failed' || s.status === 'skipped',
    )
    return {
      runId,
      steps: sorted,
      startedAt: sorted[0]?.started_at ?? null,
      trigger: sorted[0]?.trigger ?? 'unknown',
      hasFailures: failedOrSkipped.length > 0,
      retryKeys: failedOrSkipped.map((s) => s.step_key),
    }
  })
}

function RouteComponent() {
  const jobSteps = useGetPipelineJobSteps({ limit: 500 })
  const runPipeline = usePostRunRankingsPipeline()
  const retrySteps = usePostRetryPipelineSteps()

  const runs = jobSteps.data ? groupRuns(jobSteps.data) : []

  // customFetch already surfaces success/error notifications for POST calls.
  const runNow = () =>
    runPipeline.mutate(undefined, { onSuccess: () => jobSteps.refetch() })

  const retry = (runId: string, stepKeys: string[]) =>
    retrySteps.mutate(
      { data: { runId, stepKeys } },
      { onSuccess: () => jobSteps.refetch() },
    )

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>Pipeline Runs</Title>
          <Text c="dimmed" size="sm">
            The rankings pipeline runs automatically every Monday at 9am UK time.
            Each step's outcome is recorded here.
          </Text>
        </div>
        <Button onClick={runNow} loading={runPipeline.isPending}>
          Run full pipeline now
        </Button>
      </Group>

      {jobSteps.isLoading && <Loader />}
      {jobSteps.data && runs.length === 0 && (
        <Text c="dimmed">No pipeline runs recorded yet.</Text>
      )}

      {runs.map((run) => (
        <Card key={run.runId} withBorder>
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <Badge color={run.hasFailures ? 'red' : 'green'} variant="light">
                {run.hasFailures ? 'Attention' : 'OK'}
              </Badge>
              <Badge variant="outline" color="gray">
                {run.trigger}
              </Badge>
              <Text size="sm" c="dimmed">
                {formatTime(run.startedAt)}
              </Text>
            </Group>
            {run.hasFailures && (
              <Button
                size="xs"
                variant="light"
                color="orange"
                loading={retrySteps.isPending}
                onClick={() => retry(run.runId, run.retryKeys)}
              >
                Retry failed
              </Button>
            )}
          </Group>

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Step</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Attempts</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Error</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {run.steps.map((step) => (
                <Table.Tr key={step.id}>
                  <Table.Td>
                    <Text ff="monospace" size="sm">
                      {step.step_key}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={statusColor(step.status)} variant="light">
                      {step.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{step.attempts}</Table.Td>
                  <Table.Td>{duration(step)}</Table.Td>
                  <Table.Td>
                    {step.error ? (
                      <Tooltip label={step.error} multiline maw={400} withArrow>
                        <Text size="sm" c="red" lineClamp={1} maw={300}>
                          {step.error.split('\n')[0]}
                        </Text>
                      </Tooltip>
                    ) : (
                      '—'
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      ))}
    </Stack>
  )
}
