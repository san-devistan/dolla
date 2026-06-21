import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { ShootPageStateSetters } from "@/features/cloudinary/shoot/_lib/action-types"

function useShootPageSelectionActions({
  setActiveViewerAssetId,
  setSelectedAssetIds,
}: Pick<
  ShootPageStateSetters,
  "setActiveViewerAssetId" | "setSelectedAssetIds"
>) {
  return {
    clearAssetSelection: useStableCallback(() => {
      setSelectedAssetIds(new Set())
    }),
    closeAssetViewer: useStableCallback(() => {
      setActiveViewerAssetId(null)
    }),
    openAssetViewer: useStableCallback((assetId: string) => {
      setActiveViewerAssetId(assetId)
    }),
    toggleAssetSelection: useStableCallback(
      (assetId: string, selected?: boolean) => {
        setSelectedAssetIds((currentAssetIds) => {
          const nextAssetIds = new Set(currentAssetIds)
          const shouldSelect = selected ?? !nextAssetIds.has(assetId)

          if (shouldSelect) {
            nextAssetIds.add(assetId)
          } else {
            nextAssetIds.delete(assetId)
          }

          return nextAssetIds
        })
      }
    ),
  }
}

export { useShootPageSelectionActions }
