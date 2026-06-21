import {
  getCircularAsset,
  getViewerImageUrl,
  isViewerImageLoaded,
  markViewerImageLoaded,
  preloadViewerAssetsAround,
} from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryAsset } from "@/lib/cloudinary.server"
import { useEffect, useEffectEvent, useMemo, useState } from "react"

function usePhotoViewerState({
  activeAssetId,
  assets,
}: {
  activeAssetId: string | null
  assets: CloudinaryAsset[]
}) {
  const activeAsset = useMemo(
    () =>
      activeAssetId
        ? assets.find((asset) => asset.assetId === activeAssetId)
        : undefined,
    [activeAssetId, assets]
  )
  const imageUrl = activeAsset ? getViewerImageUrl(activeAsset) : undefined
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null)
  const markImageLoaded = useStableCallback(() => {
    if (!imageUrl) {
      return
    }

    markViewerImageLoaded(imageUrl)
    setLoadedImageUrl(imageUrl)
  })

  return {
    activeAsset,
    imageUrl,
    isImageLoaded:
      imageUrl !== undefined &&
      (loadedImageUrl === imageUrl || isViewerImageLoaded(imageUrl)),
    markImageLoaded,
  }
}

function usePhotoViewerKeyboard({
  activeAssetId,
  assets,
  onClose,
  onSelectAsset,
}: {
  activeAssetId: string | null
  assets: CloudinaryAsset[]
  onClose: () => void
  onSelectAsset: (assetId: string) => void
}) {
  const closeViewer = useEffectEvent(onClose)
  const selectViewerAsset = useEffectEvent(onSelectAsset)

  useEffect(() => {
    if (!activeAssetId) {
      return undefined
    }

    const currentAssetId = activeAssetId

    function handleKeyDown(event: KeyboardEvent) {
      const nextAsset = getKeyboardNavigationAsset({
        assets,
        currentAssetId,
        key: event.key,
      })

      if (event.key === "Escape") {
        event.preventDefault()
        closeViewer()
        return
      }

      if (nextAsset) {
        event.preventDefault()
        selectViewerAsset(nextAsset.assetId)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeAssetId, assets])
}

function usePhotoViewerPreload({
  activeAssetId,
  assets,
}: {
  activeAssetId: string | null
  assets: CloudinaryAsset[]
}) {
  useEffect(() => {
    if (!activeAssetId) {
      return undefined
    }

    preloadViewerAssetsAround(assets, activeAssetId)

    return undefined
  }, [activeAssetId, assets])
}

function useSelectAdjacentAsset({
  activeAsset,
  assets,
  onSelectAsset,
}: {
  activeAsset: CloudinaryAsset | undefined
  assets: CloudinaryAsset[]
  onSelectAsset: (assetId: string) => void
}) {
  const previous = useStableCallback(() => {
    selectAdjacentAsset({ activeAsset, assets, direction: -1, onSelectAsset })
  })
  const next = useStableCallback(() => {
    selectAdjacentAsset({ activeAsset, assets, direction: 1, onSelectAsset })
  })

  return { next, previous }
}

function getKeyboardNavigationAsset({
  assets,
  currentAssetId,
  key,
}: {
  assets: CloudinaryAsset[]
  currentAssetId: string
  key: string
}) {
  if (key === "ArrowLeft") {
    return getCircularAsset(assets, currentAssetId, -1)
  }

  if (key === "ArrowRight") {
    return getCircularAsset(assets, currentAssetId, 1)
  }

  return undefined
}

function selectAdjacentAsset({
  activeAsset,
  assets,
  direction,
  onSelectAsset,
}: {
  activeAsset: CloudinaryAsset | undefined
  assets: CloudinaryAsset[]
  direction: -1 | 1
  onSelectAsset: (assetId: string) => void
}) {
  if (!activeAsset) {
    return
  }

  const nextAsset = getCircularAsset(assets, activeAsset.assetId, direction)

  if (nextAsset) {
    onSelectAsset(nextAsset.assetId)
  }
}

export {
  usePhotoViewerKeyboard,
  usePhotoViewerPreload,
  usePhotoViewerState,
  useSelectAdjacentAsset,
}
