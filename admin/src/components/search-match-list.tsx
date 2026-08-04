import {
  Avatar,
  Box,
  Button,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { useEffect, useState } from 'react'

export type SearchMatchOption = {
  key: string
  avatarUrl?: string | null
  primary: string
  secondary?: string | null
}

/**
 * Search box plus a list of candidates, each with a two-click action button
 * ("Merge" → "Confirm merge?"). Shared by the identity cards and the player
 * page, which differ only in what they search for and what confirming does.
 */
export const SearchMatchList: React.FC<{
  label: string
  placeholder?: string
  initialText: string
  options: SearchMatchOption[] | undefined
  isLoading: boolean
  isError: boolean
  actionLabel: string
  confirmLabel: string
  isPending: boolean
  onSearchTextChange: (text: string) => void
  onConfirm: (option: SearchMatchOption) => void
}> = ({
  label,
  placeholder,
  initialText,
  options,
  isLoading,
  isError,
  actionLabel,
  confirmLabel,
  isPending,
  onSearchTextChange,
  onConfirm,
}) => {
  const [text, setText] = useState(initialText)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  // Reseed the box when the subject changes — deliberately not on every render,
  // so typing isn't clobbered by the parent re-rendering.
  useEffect(() => {
    setText(initialText)
    onSearchTextChange(initialText)
  }, [initialText])

  useEffect(() => {
    if (!pendingKey) return
    const timer = setTimeout(() => setPendingKey(null), 4000)
    return () => clearTimeout(timer)
  }, [pendingKey])

  const handleClick = (option: SearchMatchOption) => {
    if (pendingKey !== option.key) {
      setPendingKey(option.key)
      return
    }
    setPendingKey(null)
    onConfirm(option)
  }

  return (
    <Box>
      <TextInput
        label={label}
        value={text}
        onChange={(e) => {
          setText(e.currentTarget.value)
          onSearchTextChange(e.currentTarget.value)
        }}
        placeholder={placeholder}
        mb="sm"
      />
      {isLoading && <Text size="sm">Loading...</Text>}
      {isError && (
        <Text size="sm" c="red">
          Error loading options
        </Text>
      )}
      {options && (
        <Stack gap="xs">
          {options.map((option) => (
            <Box key={option.key}>
              <Group wrap="nowrap" justify="space-between">
                <Group wrap="nowrap" gap="sm">
                  <Avatar src={option.avatarUrl ?? undefined} size="md" />
                  <Stack gap={2}>
                    <Text size="sm">{option.primary}</Text>
                    {option.secondary && (
                      <Text size="xs" c="dimmed">
                        {option.secondary}
                      </Text>
                    )}
                  </Stack>
                </Group>
                <Button
                  size="compact-xs"
                  color={pendingKey === option.key ? 'yellow' : undefined}
                  loading={isPending}
                  onClick={() => handleClick(option)}
                >
                  {pendingKey === option.key ? confirmLabel : actionLabel}
                </Button>
              </Group>
              <Divider mt="xs" />
            </Box>
          ))}
        </Stack>
      )}
      {options && options.length === 0 && <Text size="sm">No results found</Text>}
    </Box>
  )
}
