import { TeamAvatar } from '#/components/team-avatar'
import { Link } from '#/components/link'
import { Tooltip } from '#/components/ui/tooltip'

interface PlayerTeamIconProps {
  team_id: number | null
  team_name: string | null
  image_key: string | null
  size?: number
}

/** A player's current-team avatar: tooltip + link to the team page. Renders
 * nothing when the player has no team. */
export function PlayerTeamIcon({
  team_id,
  team_name,
  image_key,
  size = 35,
}: PlayerTeamIconProps) {
  if (team_id == null) return null

  return (
    <Tooltip label={team_name}>
      <Link to="/team/$id" params={{ id: String(team_id) }} search={{ tab: undefined }}>
        <TeamAvatar image_key={image_key} name={team_name ?? '?'} size={size} />
      </Link>
    </Tooltip>
  )
}
