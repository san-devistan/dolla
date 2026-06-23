import type {
  CategoryPageActionState,
  ReorderAssetsFn,
} from "@/features/cloudinary/category/_lib/action-types"
import { getErrorMessage } from "@/features/cloudinary/category/_lib/utils"
import {
  type AssetDropPosition,
  getAssetDropPosition,
  getAssetLayoutOrder,
  moveAssetToColumnEnd,
  moveAssetToDropTarget,
} from "@/features/cloudinary/media/_lib/asset-layout"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryAsset } from "@/lib/cloudinary.server"
import { toast } from "@workspace/ui/lib/toast"
import type { DragEvent } from "react"

const ASSET_ORDER_STEP = 1000

function useCategoryPagePhotoOrderActions({
  canOrganizeCategoryPhotos,
  reorderAssets,
  state,
}: {
  canOrganizeCategoryPhotos: boolean
  reorderAssets: ReorderAssetsFn
  state: CategoryPageActionState
}) {
  const saveAssetOrder = useSaveAssetOrder({ reorderAssets, state })

  return {
    handleAssetDragEnd: useStableCallback(() => {
      state.setDraggingAssetId(null)
      state.setAssetDropTarget(null)
    }),
    handleAssetDragOver: useAssetDragOver({
      canOrganizeCategoryPhotos,
      state,
    }),
    handleAssetDragStart: useAssetDragStart({
      canOrganizeCategoryPhotos,
      state,
    }),
    handleAssetDrop: useAssetDrop({
      canOrganizeCategoryPhotos,
      saveAssetOrder,
      state,
    }),
    handleAssetInsertionDragOver: useAssetInsertionDragOver({
      canOrganizeCategoryPhotos,
      state,
    }),
    handleColumnDragOver: useColumnDragOver({
      canOrganizeCategoryPhotos,
      state,
    }),
    handleColumnDrop: useColumnDrop({
      canOrganizeCategoryPhotos,
      saveAssetOrder,
      state,
    }),
  }
}

function useAssetDragStart({
  canOrganizeCategoryPhotos,
  state,
}: {
  canOrganizeCategoryPhotos: boolean
  state: CategoryPageActionState
}) {
  return useStableCallback((event: DragEvent<HTMLElement>, assetId: string) => {
    if (!canOrganizeCategoryPhotos) {
      return
    }

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", assetId)
    state.setDraggingAssetId(assetId)
  })
}

function useAssetDragOver({
  canOrganizeCategoryPhotos,
  state,
}: {
  canOrganizeCategoryPhotos: boolean
  state: CategoryPageActionState
}) {
  return useStableCallback((event: DragEvent<HTMLElement>, assetId: string) => {
    if (!canOrganizeCategoryPhotos || state.draggingAssetId === assetId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setAssetDropTarget({
      assetId,
      position: getAssetDropPosition(event),
      state,
    })
  })
}

function useAssetInsertionDragOver({
  canOrganizeCategoryPhotos,
  state,
}: {
  canOrganizeCategoryPhotos: boolean
  state: CategoryPageActionState
}) {
  return useStableCallback(
    (
      event: DragEvent<HTMLElement>,
      assetId: string,
      position: AssetDropPosition
    ) => {
      if (!canOrganizeCategoryPhotos || state.draggingAssetId === assetId) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      setAssetDropTarget({ assetId, position, state })
    }
  )
}

function useAssetDrop({
  canOrganizeCategoryPhotos,
  saveAssetOrder,
  state,
}: {
  canOrganizeCategoryPhotos: boolean
  saveAssetOrder: (nextAssets: CloudinaryAsset[]) => void
  state: CategoryPageActionState
}) {
  return useStableCallback((event: DragEvent<HTMLElement>, assetId: string) => {
    if (!canOrganizeCategoryPhotos) {
      return
    }

    event.preventDefault()

    const draggedAssetId =
      event.dataTransfer.getData("text/plain") || state.draggingAssetId
    const dropPosition =
      state.assetDropTarget?.type === "asset" &&
      state.assetDropTarget.assetId === assetId
        ? state.assetDropTarget.position
        : getAssetDropPosition(event)

    if (!draggedAssetId || draggedAssetId === assetId) {
      return
    }

    const nextAssets = moveAssetToDropTarget({
      assets: state.categoryPage.assets,
      columnCount: state.masonryColumnCount,
      draggedAssetId,
      targetAssetId: assetId,
      dropPosition,
    })

    if (nextAssets) {
      saveAssetOrder(nextAssets)
    }
  })
}

function useColumnDragOver({
  canOrganizeCategoryPhotos,
  state,
}: {
  canOrganizeCategoryPhotos: boolean
  state: CategoryPageActionState
}) {
  return useStableCallback(
    (event: DragEvent<HTMLElement>, columnIndex: number) => {
      if (!canOrganizeCategoryPhotos || !state.draggingAssetId) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      state.setAssetDropTarget((currentDropTarget) =>
        currentDropTarget?.type === "column-end" &&
        currentDropTarget.columnIndex === columnIndex
          ? currentDropTarget
          : { columnIndex, type: "column-end" }
      )
    }
  )
}

function useColumnDrop({
  canOrganizeCategoryPhotos,
  saveAssetOrder,
  state,
}: {
  canOrganizeCategoryPhotos: boolean
  saveAssetOrder: (nextAssets: CloudinaryAsset[]) => void
  state: CategoryPageActionState
}) {
  return useStableCallback(
    (event: DragEvent<HTMLElement>, columnIndex: number) => {
      if (!canOrganizeCategoryPhotos) {
        return
      }

      event.preventDefault()

      const draggedAssetId =
        event.dataTransfer.getData("text/plain") || state.draggingAssetId

      if (!draggedAssetId) {
        return
      }

      const nextAssets = moveAssetToColumnEnd(
        state.categoryPage.assets,
        draggedAssetId,
        columnIndex,
        state.masonryColumnCount
      )

      if (nextAssets) {
        saveAssetOrder(nextAssets)
      }
    }
  )
}

function useSaveAssetOrder({
  reorderAssets,
  state,
}: {
  reorderAssets: ReorderAssetsFn
  state: CategoryPageActionState
}) {
  return useStableCallback((nextAssets: CloudinaryAsset[]) => {
    if (!state.selectedCategory) {
      return
    }

    const previousCategoryPage = state.categoryPage
    const orderedAssets = nextAssets.map((asset, index) => ({
      ...asset,
      orderRank: (index + 1) * ASSET_ORDER_STEP,
    }))
    const shootPath =
      state.directCategoryShootPath || state.selectedCategory.path

    state.setCategoryPage({ ...state.categoryPage, assets: orderedAssets })
    state.setDraggingAssetId(null)
    state.setAssetDropTarget(null)

    void reorderAssets({
      data: {
        shootPath,
        selectedFolder: state.selectedCategory.path,
        assetIds: orderedAssets.map((asset) => asset.assetId),
        assetLayouts: getAssetLayoutOrder(
          orderedAssets,
          state.masonryColumnCount
        ),
      },
    })
      .then(() => {
        toast.success("Photo order saved")

        return undefined
      })
      .catch((orderError) => {
        state.setCategoryPage(previousCategoryPage)
        toast.error(getErrorMessage(orderError))

        return undefined
      })
  })
}

function setAssetDropTarget({
  assetId,
  position,
  state,
}: {
  assetId: string
  position: AssetDropPosition
  state: CategoryPageActionState
}) {
  state.setAssetDropTarget((currentDropTarget) =>
    currentDropTarget?.type === "asset" &&
    currentDropTarget.assetId === assetId &&
    currentDropTarget.position === position
      ? currentDropTarget
      : { assetId, position, type: "asset" }
  )
}

export { useCategoryPagePhotoOrderActions }
