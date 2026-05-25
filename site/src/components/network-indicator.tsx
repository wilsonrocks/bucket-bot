import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { Download, Upload } from 'lucide-react'

export const NetworkIndicator = () => {
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()

  return (
    <div className="flex items-center gap-2">
      {isFetching && <Download size={16} />}
      {isMutating && <Upload size={16} />}
    </div>
  )
}
