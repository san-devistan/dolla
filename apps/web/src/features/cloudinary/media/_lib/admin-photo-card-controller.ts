import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import { cn } from "@workspace/ui/lib/utils"
import type { DragEvent, MouseEvent } from "react"

type AdminPhotoCardState = {
  isBusy: boolean
  isCover: boolean
  isDragging: boolean
  isHomeCarouselAsset: boolean
  isPriority: boolean
  isSelected: boolean
  showCoverControl: boolean
}

type AdminPhotoCardHandlers = {
  onAssetDragEnd: () => void
  onAssetDragOver: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDragStart: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDrop: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetSelectionChange: (assetId: string, selected?: boolean) => void
  onSetShootCover: (assetId: string) => void
  onToggleHomeCarouselAsset: (assetId: string, selected: boolean) => void
}

function useAdminPhotoDragHandlers({
  assetId,
  handlers,
}: {
  assetId: string
  handlers: AdminPhotoCardHandlers
}) {
  const onDragStart = useStableCallback((event: DragEvent<HTMLElement>) => {
    handlers.onAssetDragStart(event, assetId)
  })
  const onDragOver = useStableCallback((event: DragEvent<HTMLElement>) => {
    handlers.onAssetDragOver(event, assetId)
  })
  const onDrop = useStableCallback((event: DragEvent<HTMLElement>) => {
    handlers.onAssetDrop(event, assetId)
  })

  return {
    article: {
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd: handlers.onAssetDragEnd,
    },
    button: {
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd: handlers.onAssetDragEnd,
    },
  }
}

function useAdminPhotoSelectionHandlers({
  assetId,
  handlers,
}: {
  assetId: string
  handlers: AdminPhotoCardHandlers
}) {
  return {
    onSelectionClick: useStableCallback(() => {
      handlers.onAssetSelectionChange(assetId)
    }),
    stopClickPropagation: useStableCallback(
      (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation()
      }
    ),
    onCheckedChange: useStableCallback((checked: boolean) => {
      handlers.onAssetSelectionChange(assetId, checked)
    }),
  }
}

function useAdminPhotoActionHandlers({
  assetId,
  handlers,
  isHomeCarouselAsset,
}: {
  assetId: string
  handlers: AdminPhotoCardHandlers
  isHomeCarouselAsset: boolean
}) {
  return {
    onHomeCarouselClick: useStableCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        handlers.onToggleHomeCarouselAsset(assetId, !isHomeCarouselAsset)
      }
    ),
    onCoverClick: useStableCallback((event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      handlers.onSetShootCover(assetId)
    }),
  }
}

function getAdminPhotoCardClass({
  canOrganizeAssets,
  state,
}: {
  canOrganizeAssets: boolean
  state: AdminPhotoCardState
}) {
  return cn(
    "group/photo relative overflow-hidden border bg-card transition duration-200",
    canOrganizeAssets && !state.isBusy
      ? "cursor-grab active:cursor-grabbing"
      : "",
    state.isDragging ? "opacity-45 ring-2 ring-brand/50" : "",
    state.isSelected ? "ring-2 ring-brand/70" : "hover:border-foreground/40"
  )
}

export {
  getAdminPhotoCardClass,
  useAdminPhotoActionHandlers,
  useAdminPhotoDragHandlers,
  useAdminPhotoSelectionHandlers,
}
export type { AdminPhotoCardHandlers, AdminPhotoCardState }
