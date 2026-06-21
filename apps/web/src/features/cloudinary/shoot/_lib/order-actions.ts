import {
  type AssetDropPosition,
  getAssetDropPosition,
  getAssetLayoutOrder,
  moveAssetToColumnEnd,
  moveAssetToDropTarget,
} from "@/features/cloudinary/media/_lib/asset-layout"
import { getErrorMessage } from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type {
  ReorderAssetsFn,
  ShootPageActionState,
} from "@/features/cloudinary/shoot/_lib/action-types"
import type { CloudinaryAsset } from "@/lib/cloudinary.server"
import { toast } from "@workspace/ui/components/sonner"
import type { DragEvent } from "react"

const ASSET_ORDER_STEP = 1000

function useShootPageOrderActions({
  canOrganizeAssets,
  reorderAssets,
  state,
}: {
  canOrganizeAssets: boolean
  reorderAssets: ReorderAssetsFn
  state: ShootPageActionState
}) {
  const saveAssetOrder = useStableCallback((nextAssets: CloudinaryAsset[]) => {
    if (!state.shootFolder) {
      return
    }

    const previousShootPage = state.shootPage
    const orderedAssets = nextAssets.map((asset, index) => ({
      ...asset,
      orderRank: (index + 1) * ASSET_ORDER_STEP,
    }))

    state.setShootPage({ ...state.shootPage, assets: orderedAssets })
    state.setDraggingAssetId(null)
    state.setDropTarget(null)

    void reorderAssets({
      data: {
        shootPath: state.shootFolder.path,
        selectedFolder: state.shootFolder.path,
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
        state.setShootPage(previousShootPage)
        toast.error(getErrorMessage(orderError))

        return undefined
      })
  })

  return {
    handleAssetDragEnd: useStableCallback(() => {
      state.setDraggingAssetId(null)
      state.setDropTarget(null)
    }),
    handleAssetDragOver: useAssetDragOver({ canOrganizeAssets, state }),
    handleAssetDragStart: useStableCallback(
      (event: DragEvent<HTMLElement>, assetId: string) => {
        if (!canOrganizeAssets) {
          return
        }

        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", assetId)
        state.setDraggingAssetId(assetId)
      }
    ),
    handleAssetDrop: useAssetDrop({ canOrganizeAssets, saveAssetOrder, state }),
    handleAssetInsertionDragOver: useAssetInsertionDragOver({
      canOrganizeAssets,
      state,
    }),
    handleColumnDragOver: useColumnDragOver({ canOrganizeAssets, state }),
    handleColumnDrop: useColumnDrop({
      canOrganizeAssets,
      saveAssetOrder,
      state,
    }),
  }
}

function useAssetDragOver({
  canOrganizeAssets,
  state,
}: {
  canOrganizeAssets: boolean
  state: ShootPageActionState
}) {
  return useStableCallback((event: DragEvent<HTMLElement>, assetId: string) => {
    if (!canOrganizeAssets || state.draggingAssetId === assetId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const position = getAssetDropPosition(event)

    setAssetDropTarget({ assetId, position, state })
  })
}

function useAssetInsertionDragOver({
  canOrganizeAssets,
  state,
}: {
  canOrganizeAssets: boolean
  state: ShootPageActionState
}) {
  return useStableCallback(
    (
      event: DragEvent<HTMLElement>,
      assetId: string,
      position: AssetDropPosition
    ) => {
      if (!canOrganizeAssets || state.draggingAssetId === assetId) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      setAssetDropTarget({ assetId, position, state })
    }
  )
}

function useAssetDrop({
  canOrganizeAssets,
  saveAssetOrder,
  state,
}: {
  canOrganizeAssets: boolean
  saveAssetOrder: (nextAssets: CloudinaryAsset[]) => void
  state: ShootPageActionState
}) {
  return useStableCallback((event: DragEvent<HTMLElement>, assetId: string) => {
    if (!canOrganizeAssets) {
      return
    }

    event.preventDefault()

    const draggedAssetId =
      event.dataTransfer.getData("text/plain") || state.draggingAssetId
    const dropPosition =
      state.dropTarget?.type === "asset" && state.dropTarget.assetId === assetId
        ? state.dropTarget.position
        : getAssetDropPosition(event)

    if (!draggedAssetId || draggedAssetId === assetId) {
      return
    }

    const nextAssets = moveAssetToDropTarget({
      assets: state.shootPage.assets,
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
  canOrganizeAssets,
  state,
}: {
  canOrganizeAssets: boolean
  state: ShootPageActionState
}) {
  return useStableCallback(
    (event: DragEvent<HTMLElement>, columnIndex: number) => {
      if (!canOrganizeAssets || !state.draggingAssetId) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "move"

      state.setDropTarget((currentDropTarget) => {
        if (
          currentDropTarget?.type === "column-end" &&
          currentDropTarget.columnIndex === columnIndex
        ) {
          return currentDropTarget
        }

        return { columnIndex, type: "column-end" }
      })
    }
  )
}

function useColumnDrop({
  canOrganizeAssets,
  saveAssetOrder,
  state,
}: {
  canOrganizeAssets: boolean
  saveAssetOrder: (nextAssets: CloudinaryAsset[]) => void
  state: ShootPageActionState
}) {
  return useStableCallback(
    (event: DragEvent<HTMLElement>, columnIndex: number) => {
      if (!canOrganizeAssets) {
        return
      }

      event.preventDefault()

      const draggedAssetId =
        event.dataTransfer.getData("text/plain") || state.draggingAssetId

      if (!draggedAssetId) {
        return
      }

      const nextAssets = moveAssetToColumnEnd(
        state.shootPage.assets,
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

function setAssetDropTarget({
  assetId,
  position,
  state,
}: {
  assetId: string
  position: AssetDropPosition
  state: ShootPageActionState
}) {
  state.setDropTarget((currentDropTarget) => {
    if (
      currentDropTarget?.type === "asset" &&
      currentDropTarget?.assetId === assetId &&
      currentDropTarget.position === position
    ) {
      return currentDropTarget
    }

    return { assetId, position, type: "asset" }
  })
}

export { useShootPageOrderActions }
