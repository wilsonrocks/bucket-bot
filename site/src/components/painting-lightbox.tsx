import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Link } from '#/components/link'

export type PaintingLightboxWinner = {
  id: number
  imageKey: string | null
  playerName: string
  playerId: number | null
  model: string | null
  description: string | null
  categoryName: string
  position: number
  totalWinners: number
}

export function positionLabel(position: number, total: number): string {
  if (total === 1) return 'Winner'
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${position}${suffixes[position] ?? 'th'}`
}

export function PaintingLightbox({
  winner,
  onClose,
  linkPlayerName = false,
}: {
  winner: PaintingLightboxWinner | null
  onClose: () => void
  linkPlayerName?: boolean
}) {
  return (
    <Dialog.Root open={!!winner} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">
              {winner ? `${winner.categoryName} — ${positionLabel(winner.position, winner.totalWinners)}` : ''}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          {winner && (
            <div>
              {winner.imageKey && (
                <img
                  src={`${import.meta.env.VITE_ASSETS_URL}/${winner.imageKey}-w800.png`}
                  alt={winner.playerName}
                  className="mb-4 max-h-[500px] w-full rounded-sm object-contain"
                />
              )}
              {linkPlayerName && winner.playerId != null ? (
                <Link
                  to="/player/$id"
                  params={{ id: winner.playerId }}
                  search={{ tab: 'painting', typeCode: undefined, painting: undefined }}
                  className="font-semibold"
                >
                  {winner.playerName}
                </Link>
              ) : (
                <p className="font-semibold">{winner.playerName}</p>
              )}
              {winner.model && <p className="text-sm text-gray-500">{winner.model}</p>}
              {winner.description && <p className="mt-1 text-sm">{winner.description}</p>}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
