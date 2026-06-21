import type {
  CategoryPageActionState,
  DeleteFolderFn,
  GetCategoryFn,
  MoveShootsFn,
  ReorderShootsFn,
  SetCategoryCoverFn,
} from "@/features/cloudinary/category/_lib/action-types"
import { useCategoryPageShootOrderActions } from "@/features/cloudinary/category/_lib/shoot-order-actions"
import {
  getEffectiveMoveTargetCategoryPath,
  getErrorMessage,
} from "@/features/cloudinary/category/_lib/utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryCategoryPage } from "@/lib/cloudinary.server"
import { toast } from "@workspace/ui/components/sonner"

function useCategoryPageShootActions({
  canOrganizeShoots,
  deleteFolder,
  getCategory,
  moveShoots,
  performCategoryAction,
  reorderShoots,
  setCategoryCover,
  state,
}: {
  canOrganizeShoots: boolean
  deleteFolder: DeleteFolderFn
  getCategory: GetCategoryFn
  moveShoots: MoveShootsFn
  performCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>
  ) => Promise<CloudinaryCategoryPage>
  reorderShoots: ReorderShootsFn
  setCategoryCover: SetCategoryCoverFn
  state: CategoryPageActionState
}) {
  const clearShootSelection = useStableCallback(() => {
    state.setSelectedShootPaths(new Set())
  })
  const orderActions = useCategoryPageShootOrderActions({
    canOrganizeShoots,
    reorderShoots,
    state,
  })

  return {
    clearShootSelection,
    handleDeleteSelectedShoots: useDeleteSelectedShoots({
      clearShootSelection,
      deleteFolder,
      getCategory,
      performCategoryAction,
      state,
    }),
    handleMoveSelectedShoots: useMoveSelectedShoots({
      clearShootSelection,
      getCategory,
      moveShoots,
      performCategoryAction,
      state,
    }),
    handleSetCategoryCover: useSetCategoryCover({ setCategoryCover, state }),
    ...orderActions,
    toggleShootSelection: useStableCallback(
      (shootPath: string, selected?: boolean) => {
        state.setSelectedShootPaths((currentShootPaths) => {
          const nextShootPaths = new Set(currentShootPaths)
          const shouldSelect = selected ?? !nextShootPaths.has(shootPath)

          if (shouldSelect) {
            nextShootPaths.add(shootPath)
          } else {
            nextShootPaths.delete(shootPath)
          }

          return nextShootPaths
        })
      }
    ),
  }
}

function useDeleteSelectedShoots({
  clearShootSelection,
  deleteFolder,
  getCategory,
  performCategoryAction,
  state,
}: {
  clearShootSelection: () => void
  deleteFolder: DeleteFolderFn
  getCategory: GetCategoryFn
  performCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>
  ) => Promise<CloudinaryCategoryPage>
  state: CategoryPageActionState
}) {
  return useStableCallback(() => {
    if (!state.selectedCategory) {
      return
    }

    const shootPaths = Array.from(state.selectedShootPaths)

    if (shootPaths.length === 0) {
      return
    }

    const category = state.selectedCategory
    const deleteShootsPromise = performCategoryAction(async () => {
      await Promise.all(
        shootPaths.map((shootPath) =>
          deleteFolder({ data: { folderPath: shootPath } })
        )
      )

      return await getCategory({ data: { categoryName: category.name } })
    })

    toast.promise(deleteShootsPromise, {
      loading: "Deleting shoots...",
      success: shootPaths.length === 1 ? "Shoot deleted" : "Shoots deleted",
      error: (deleteError) => getErrorMessage(deleteError),
    })

    void deleteShootsPromise
      .then(() => {
        clearShootSelection()

        return undefined
      })
      .catch(() => undefined)
  })
}

function useMoveSelectedShoots({
  clearShootSelection,
  getCategory,
  moveShoots,
  performCategoryAction,
  state,
}: {
  clearShootSelection: () => void
  getCategory: GetCategoryFn
  moveShoots: MoveShootsFn
  performCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>
  ) => Promise<CloudinaryCategoryPage>
  state: CategoryPageActionState
}) {
  return useStableCallback(() => {
    if (!state.selectedCategory) {
      return
    }

    const shootPaths = Array.from(state.selectedShootPaths)
    const targetPath = getEffectiveMoveTargetCategoryPath(
      state.moveTargetCategories,
      state.moveTargetCategoryPath
    )
    const targetCategory = state.moveTargetCategories.find(
      (categorySummary) => categorySummary.path === targetPath
    )

    if (shootPaths.length === 0) {
      return
    }

    if (!targetCategory) {
      toast.error("Choose a category to move shoots into.")
      return
    }

    const category = state.selectedCategory
    const moveShootsPromise = performCategoryAction(async () => {
      await moveShoots({
        data: {
          selectedFolder: category.path,
          shootPaths,
          targetCategoryPath: targetCategory.path,
        },
      })

      return await getCategory({ data: { categoryName: category.name } })
    })

    toast.promise(moveShootsPromise, {
      loading: "Moving shoots...",
      success:
        shootPaths.length === 1
          ? `Shoot moved to ${targetCategory.name}`
          : `Shoots moved to ${targetCategory.name}`,
      error: (moveError) => getErrorMessage(moveError),
    })

    void moveShootsPromise
      .then(() => {
        clearShootSelection()

        return undefined
      })
      .catch(() => undefined)
  })
}

function useSetCategoryCover({
  setCategoryCover,
  state,
}: {
  setCategoryCover: SetCategoryCoverFn
  state: CategoryPageActionState
}) {
  return useStableCallback((shootPath: string) => {
    if (!state.selectedCategory) {
      return
    }

    if (state.selectedCategory.coverShootPath === shootPath) {
      return
    }

    const previousCategoryPage = state.categoryPage
    const selectedShoot = state.categoryPage.shoots.find(
      (shoot) => shoot.path === shootPath
    )

    state.setCategoryPage({
      ...state.categoryPage,
      category: {
        ...state.selectedCategory,
        coverShootPath: shootPath,
      },
      categories: state.categoryPage.categories.map((categorySummary) =>
        categorySummary.path === state.selectedCategory?.path
          ? {
              ...categorySummary,
              cover: selectedShoot?.cover || categorySummary.cover,
            }
          : categorySummary
      ),
    })

    void setCategoryCover({
      data: {
        categoryPath: state.selectedCategory.path,
        selectedFolder: state.selectedCategory.path,
        shootPath,
      },
    })
      .then(() => {
        toast.success("Category cover saved")

        return undefined
      })
      .catch((coverError) => {
        state.setCategoryPage(previousCategoryPage)
        toast.error(getErrorMessage(coverError))

        return undefined
      })
  })
}

export { useCategoryPageShootActions }
