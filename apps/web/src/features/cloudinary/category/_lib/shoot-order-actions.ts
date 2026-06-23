import type {
  CategoryPageActionState,
  ReorderShootsFn,
} from "@/features/cloudinary/category/_lib/action-types"
import {
  getErrorMessage,
  swapShoots,
} from "@/features/cloudinary/category/_lib/utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryShootSummary } from "@/lib/cloudinary.server"
import { toast } from "@workspace/ui/lib/toast"
import type { DragEvent } from "react"

const SHOOT_ORDER_STEP = 1000

function useCategoryPageShootOrderActions({
  canOrganizeShoots,
  reorderShoots,
  state,
}: {
  canOrganizeShoots: boolean
  reorderShoots: ReorderShootsFn
  state: CategoryPageActionState
}) {
  const saveShootOrder = useSaveShootOrder({
    canOrganizeShoots,
    reorderShoots,
    state,
  })

  return {
    handleShootDragEnd: useStableCallback(() => {
      state.setDraggingShootPath(null)
      state.setShootDropTarget(null)
    }),
    handleShootDragOver: useShootDragOver({ canOrganizeShoots, state }),
    handleShootDragStart: useShootDragStart({ canOrganizeShoots, state }),
    handleShootDrop: useShootDrop({ canOrganizeShoots, saveShootOrder, state }),
  }
}

function useShootDragStart({
  canOrganizeShoots,
  state,
}: {
  canOrganizeShoots: boolean
  state: CategoryPageActionState
}) {
  return useStableCallback(
    (event: DragEvent<HTMLElement>, shootPath: string) => {
      if (!canOrganizeShoots) {
        return
      }

      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", shootPath)
      state.setDraggingShootPath(shootPath)
    }
  )
}

function useShootDragOver({
  canOrganizeShoots,
  state,
}: {
  canOrganizeShoots: boolean
  state: CategoryPageActionState
}) {
  return useStableCallback(
    (event: DragEvent<HTMLElement>, shootPath: string) => {
      if (!canOrganizeShoots || state.draggingShootPath === shootPath) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      state.setShootDropTarget((currentDropTarget) =>
        currentDropTarget?.shootPath === shootPath
          ? currentDropTarget
          : { shootPath }
      )
    }
  )
}

function useShootDrop({
  canOrganizeShoots,
  saveShootOrder,
  state,
}: {
  canOrganizeShoots: boolean
  saveShootOrder: (nextShoots: CloudinaryShootSummary[]) => void
  state: CategoryPageActionState
}) {
  return useStableCallback(
    (event: DragEvent<HTMLElement>, shootPath: string) => {
      if (!canOrganizeShoots) {
        return
      }

      event.preventDefault()

      const draggedShootPath =
        event.dataTransfer.getData("text/plain") || state.draggingShootPath

      if (!draggedShootPath || draggedShootPath === shootPath) {
        return
      }

      const nextShoots = swapShoots(
        state.categoryPage.shoots,
        draggedShootPath,
        shootPath
      )

      if (nextShoots) {
        saveShootOrder(nextShoots)
      }
    }
  )
}

function useSaveShootOrder({
  canOrganizeShoots,
  reorderShoots,
  state,
}: {
  canOrganizeShoots: boolean
  reorderShoots: ReorderShootsFn
  state: CategoryPageActionState
}) {
  return useStableCallback((nextShoots: CloudinaryShootSummary[]) => {
    if (!state.selectedCategory || !canOrganizeShoots) {
      return
    }

    const previousCategoryPage = state.categoryPage
    const orderedShoots = nextShoots.map((shoot, index) => ({
      ...shoot,
      orderRank: (index + 1) * SHOOT_ORDER_STEP,
    }))

    state.setCategoryPage({ ...state.categoryPage, shoots: orderedShoots })
    state.setDraggingShootPath(null)
    state.setShootDropTarget(null)

    void reorderShoots({
      data: {
        categoryPath: state.selectedCategory.path,
        selectedFolder: state.selectedCategory.path,
        shootPaths: orderedShoots.map((shoot) => shoot.path),
      },
    })
      .then(() => {
        toast.success("Shoot order saved")

        return undefined
      })
      .catch((orderError) => {
        state.setCategoryPage(previousCategoryPage)
        toast.error(getErrorMessage(orderError))

        return undefined
      })
  })
}

export { useCategoryPageShootOrderActions }
