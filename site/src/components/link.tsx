import { createLink } from '@tanstack/react-router'
import type { LinkComponent } from '@tanstack/react-router'
import * as React from 'react'

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>

const StyledAnchor = React.forwardRef<HTMLAnchorElement, AnchorProps>(
  ({ className = '', ...props }, ref) => (
    <a
      ref={ref}
      className={`text-blue-600 dark:text-blue-400 hover:underline ${className}`}
      {...props}
    />
  ),
)

const CreatedLinkComponent = createLink(StyledAnchor)

export const Link: LinkComponent<typeof StyledAnchor> = (props) => {
  return <CreatedLinkComponent preload="intent" {...props} />
}
