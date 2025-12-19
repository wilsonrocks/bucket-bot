import { Anchor } from '@mantine/core'
import { Link as TanstackLink } from '@tanstack/react-router'
import type React from 'react'

export const Link = (props: React.ComponentProps<typeof TanstackLink>) => (
  <Anchor component={TanstackLink} {...props} />
)
