import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { formatDate, parseISO } from 'date-fns'
import { Link } from '#/components/link'
import { Image } from '#/components/image'
import { ShareButton } from '#/components/share-button'
import { achievementShareText, achievementShareUrl } from '#/helpers/achievements'

export type EarnedAchievement = {
  id: string
  name: string
  description: string
  flavourText: string
  flavourSource: string | null
  imageKey: string | null
  imageWidth: number | null
  imageHeight: number | null
  achievedOn: string
  tourneyId: number | null
  tourneyName: string | null
}

export function AchievementModal({
  achievement,
  playerId,
  playerName,
  onClose,
}: {
  achievement: EarnedAchievement | null
  playerId: number
  playerName: string
  onClose: () => void
}) {
  return (
    <Dialog.Root open={!!achievement} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-fade fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">{achievement?.name ?? ''}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          {achievement && (
            <div className="flex flex-col items-center gap-3 text-center">
              {achievement.imageKey ? (
                <Image
                  imageKey={achievement.imageKey}
                  width={achievement.imageWidth}
                  height={achievement.imageHeight}
                  alt={achievement.name}
                  sizes="240px"
                  fallbackWidth={400}
                  loading="eager"
                  className="h-auto w-60 rounded-sm"
                />
              ) : (
                <div className="flex aspect-square w-60 items-center justify-center rounded-sm bg-muted text-7xl" aria-hidden>
                  🏅
                </div>
              )}
              <Dialog.Description asChild>
                <div className="text-sm">
                  {achievement.description.trim() && <p>{achievement.description}</p>}
                  {achievement.flavourText.trim() && (
                    <blockquote className="mt-2 italic">
                      “{achievement.flavourText}”
                      {achievement.flavourSource && (
                        <footer className="not-italic">— {achievement.flavourSource}</footer>
                      )}
                    </blockquote>
                  )}
                  <p className="mt-2 text-muted-foreground">
                    Earned by <span className="font-semibold text-foreground">{playerName}</span>{' '}
                    {achievement.tourneyId && achievement.tourneyName && (
                      <>
                        at{' '}
                        <Link
                          to="/event/$id"
                          params={{ id: achievement.tourneyId }}
                          search={{ tab: undefined, painting: undefined }}
                        >
                          {achievement.tourneyName}
                        </Link>{' '}
                      </>
                    )}
                    on {formatDate(parseISO(achievement.achievedOn), 'd MMMM yyyy')}
                  </p>
                </div>
              </Dialog.Description>
              <ShareButton
                url={achievementShareUrl(playerId, achievement.id)}
                title={achievement.name}
                text={achievementShareText(playerName, achievement.name)}
              />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
