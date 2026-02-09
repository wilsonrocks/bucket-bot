import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { Group } from '@mantine/core'
import { IconDownload, IconUpload } from '@tabler/icons-react'

export const NetworkIndicator = () => {
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()

  return (
    <Group>
      {isFetching && <IconDownload size="1rem" />}
      {isMutating && <IconUpload size="1rem" />}
    </Group>
  )
}
