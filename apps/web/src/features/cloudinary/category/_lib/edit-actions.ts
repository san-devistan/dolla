import type {
  DeleteFolderFn,
  GetCategoryFn,
  RenameFolderFn,
  SetCategoryDescriptionFn,
  CategoryPageActionState,
} from "@/features/cloudinary/category/_lib/action-types"
import {
  getEditableCategoryDescription,
  getErrorMessage,
  normalizeCategoryDescriptionDraft,
} from "@/features/cloudinary/category/_lib/utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import { getMediaCategoryRoute, getMediaHomeRoute } from "@/lib/admin-routes"
import type { CloudinaryCategoryPage } from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import type { AnyRouter } from "@tanstack/react-router"
import { toast } from "@workspace/ui/components/sonner"
import type { FormEvent } from "react"

function useCategoryPageEditActions({
  categoryRouteName,
  deleteFolder,
  getCategory,
  isAdminMode,
  performCategoryAction,
  renameFolder,
  router,
  runCategoryAction,
  setCategoryDescription,
  state,
}: {
  categoryRouteName: string
  deleteFolder: DeleteFolderFn
  getCategory: GetCategoryFn
  isAdminMode: boolean
  performCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>
  ) => Promise<CloudinaryCategoryPage>
  renameFolder: RenameFolderFn
  router: AnyRouter
  runCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>,
    successMessage: string
  ) => Promise<boolean>
  setCategoryDescription: SetCategoryDescriptionFn
  state: CategoryPageActionState
}) {
  return {
    cancelRenamingCategory: useStableCallback(() => {
      state.setRenameName(state.selectedCategory?.name || "")
      state.setDescriptionDraft(
        getEditableCategoryDescription(state.selectedCategory)
      )
      state.setIsRenamingCategory(false)
    }),
    handleDeleteCategory: useDeleteCategory({
      categoryRouteName,
      deleteFolder,
      getCategory,
      isAdminMode,
      router,
      runCategoryAction,
      state,
    }),
    handleRenameCategory: useRenameCategory({
      getCategory,
      isAdminMode,
      performCategoryAction,
      renameFolder,
      router,
      setCategoryDescription,
      state,
    }),
    startRenamingCategory: useStableCallback(() => {
      if (!state.selectedCategory) {
        return
      }

      state.setRenameName(state.selectedCategory.name)
      state.setDescriptionDraft(
        getEditableCategoryDescription(state.selectedCategory)
      )
      state.setIsRenamingCategory(true)
    }),
  }
}

function useRenameCategory({
  getCategory,
  isAdminMode,
  performCategoryAction,
  renameFolder,
  router,
  setCategoryDescription,
  state,
}: {
  getCategory: GetCategoryFn
  isAdminMode: boolean
  performCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>
  ) => Promise<CloudinaryCategoryPage>
  renameFolder: RenameFolderFn
  router: AnyRouter
  setCategoryDescription: SetCategoryDescriptionFn
  state: CategoryPageActionState
}) {
  return useStableCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!state.selectedCategory) {
      return
    }

    const nextName = state.renameName.trim()

    if (!nextName) {
      return
    }

    const category = state.selectedCategory
    const nextDescription = normalizeCategoryDescriptionDraft(
      state.descriptionDraft
    )
    const currentDescription = normalizeCategoryDescriptionDraft(
      getEditableCategoryDescription(category)
    )
    const isNameChanged = nextName !== category.name
    const isDescriptionChanged = nextDescription !== currentDescription

    if (!isNameChanged && !isDescriptionChanged) {
      state.setIsRenamingCategory(false)
      return
    }

    const saveCategoryPromise = performCategoryAction(async () => {
      const renamedCategory = await saveCategoryFolderChanges({
        category,
        getCategory,
        isDescriptionChanged,
        isNameChanged,
        nextDescription,
        nextName,
        renameFolder,
        setCategoryDescription,
      })

      return await getCategory({
        data: { categoryName: renamedCategory.name },
      })
    })

    toast.promise(saveCategoryPromise, {
      loading: "Saving category...",
      success: "Category saved",
      error: (saveError) => getErrorMessage(saveError),
    })

    void saveCategoryPromise
      .then(() => {
        state.setIsRenamingCategory(false)

        if (isNameChanged) {
          void router.navigate({
            to: getMediaCategoryRoute(isAdminMode),
            params: { category: toMediaRouteSegment(nextName) },
          })
        }

        return undefined
      })
      .catch(() => undefined)
  })
}

async function saveCategoryFolderChanges({
  category,
  getCategory,
  isDescriptionChanged,
  isNameChanged,
  nextDescription,
  nextName,
  renameFolder,
  setCategoryDescription,
}: {
  category: NonNullable<CategoryPageActionState["selectedCategory"]>
  getCategory: GetCategoryFn
  isDescriptionChanged: boolean
  isNameChanged: boolean
  nextDescription: string
  nextName: string
  renameFolder: RenameFolderFn
  setCategoryDescription: SetCategoryDescriptionFn
}) {
  let categoryName = category.name
  let categoryPath = category.path

  if (isNameChanged) {
    await renameFolder({
      data: {
        folderPath: category.path,
        name: nextName,
      },
    })

    categoryName = nextName

    const renamedCategoryPage = await getCategory({
      data: { categoryName: nextName },
    })

    categoryPath = renamedCategoryPage.category?.path || categoryPath
  }

  if (isDescriptionChanged) {
    await setCategoryDescription({
      data: {
        categoryPath,
        description: nextDescription,
      },
    })
  }

  return { name: categoryName }
}

function useDeleteCategory({
  categoryRouteName,
  deleteFolder,
  getCategory,
  isAdminMode,
  router,
  runCategoryAction,
  state,
}: {
  categoryRouteName: string
  deleteFolder: DeleteFolderFn
  getCategory: GetCategoryFn
  isAdminMode: boolean
  router: AnyRouter
  runCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>,
    successMessage: string
  ) => Promise<boolean>
  state: CategoryPageActionState
}) {
  return useStableCallback(() => {
    if (!state.selectedCategory) {
      return
    }

    const category = state.selectedCategory

    void runCategoryAction(async () => {
      await deleteFolder({ data: { folderPath: category.path } })

      return await getCategory({ data: { categoryName: categoryRouteName } })
    }, "Category removed").then((didSucceed) => {
      if (didSucceed) {
        void router.navigate({ to: getMediaHomeRoute(isAdminMode) })
      }

      return undefined
    })
  })
}

export { useCategoryPageEditActions }
