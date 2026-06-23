import type {
  CategoryPageActionState,
  DeleteShootAssetsFn,
  GetCategoryFn,
  ReorderAssetsFn,
  SetHomeCarouselAssetFn,
} from "@/features/cloudinary/category/_lib/action-types"
import { useCategoryPagePhotoOrderActions } from "@/features/cloudinary/category/_lib/photo-order-actions"
import { getErrorMessage } from "@/features/cloudinary/category/_lib/utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import { uploadAdminCloudinaryFiles } from "@/features/cloudinary/uploads/admin"
import { prepareImageUploadFiles } from "@/features/cloudinary/uploads/image-processing"
import type { CloudinaryCategoryPage } from "@/lib/cloudinary.server"
import { toast } from "@workspace/ui/lib/toast"
import type { ChangeEvent, RefObject } from "react"

const ASSET_ORDER_STEP = 1000

function useCategoryPagePhotoActions({
  canOrganizeCategoryPhotos,
  deleteShootAssets,
  getCategory,
  performCategoryAction,
  reorderAssets,
  setHomeCarouselAsset,
  state,
  uploadInputRef,
}: {
  canOrganizeCategoryPhotos: boolean
  deleteShootAssets: DeleteShootAssetsFn
  getCategory: GetCategoryFn
  performCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>
  ) => Promise<CloudinaryCategoryPage>
  reorderAssets: ReorderAssetsFn
  setHomeCarouselAsset: SetHomeCarouselAssetFn
  state: CategoryPageActionState
  uploadInputRef: RefObject<HTMLInputElement | null>
}) {
  const clearAssetSelection = useStableCallback(() => {
    state.setSelectedAssetIds(new Set())
  })
  const orderActions = useCategoryPagePhotoOrderActions({
    canOrganizeCategoryPhotos,
    reorderAssets,
    state,
  })

  return {
    clearAssetSelection,
    closeAssetViewer: useStableCallback(() => {
      state.setActiveViewerAssetId(null)
    }),
    handleCategoryPhotoUploadClick: useStableCallback(() => {
      uploadInputRef.current?.click()
    }),
    handleCategoryPhotoUploadFileChange: useUploadFileChange({
      getCategory,
      state,
      uploadInputRef,
    }),
    handleDeleteSelectedAssets: useDeleteSelectedAssets({
      clearAssetSelection,
      deleteShootAssets,
      getCategory,
      performCategoryAction,
      state,
    }),
    handleToggleHomeCarouselAsset: useToggleHomeCarouselAsset({
      setHomeCarouselAsset,
      state,
    }),
    openAssetViewer: useStableCallback((assetId: string) => {
      state.setActiveViewerAssetId(assetId)
    }),
    toggleAssetSelection: useStableCallback(
      (assetId: string, selected?: boolean) => {
        state.setSelectedAssetIds((currentAssetIds) => {
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
    ...orderActions,
  }
}

function useUploadFileChange({
  getCategory,
  state,
  uploadInputRef,
}: {
  getCategory: GetCategoryFn
  state: CategoryPageActionState
  uploadInputRef: RefObject<HTMLInputElement | null>
}) {
  const uploadSelectedCategoryPhotos = useStableCallback(
    async (files: File[]) => {
      if (!state.selectedCategory) {
        return
      }

      if (files.length === 0) {
        toast.error("Choose at least one file to upload.")
        return
      }

      state.setIsBusy(true)

      try {
        const uploadFiles = await prepareImageUploadFiles(files)
        const folderPath =
          state.directCategoryShootPath || state.selectedCategory.path

        await uploadAdminCloudinaryFiles({ files: uploadFiles, folderPath })

        if (uploadInputRef.current) {
          uploadInputRef.current.value = ""
        }

        const nextCategoryPage = await getCategory({
          data: { categoryName: state.selectedCategory.name },
        })

        state.setCategoryPage(nextCategoryPage)

        if (nextCategoryPage.connection.error) {
          throw new Error(nextCategoryPage.connection.error)
        }
      } finally {
        state.setIsBusy(false)
      }
    }
  )

  return useStableCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    if (files.length === 0 || !state.selectedCategory) {
      return
    }

    const uploadPromise = uploadSelectedCategoryPhotos(files)

    toast.promise(uploadPromise, {
      loading:
        files.length === 1
          ? "Preparing and uploading photo..."
          : `Preparing and uploading ${files.length} photos...`,
      success: files.length === 1 ? "Photo uploaded" : "Photos uploaded",
      error: (uploadError: unknown) => getErrorMessage(uploadError),
    })

    void uploadPromise.catch(() => undefined)
  })
}

function useDeleteSelectedAssets({
  clearAssetSelection,
  deleteShootAssets,
  getCategory,
  performCategoryAction,
  state,
}: {
  clearAssetSelection: () => void
  deleteShootAssets: DeleteShootAssetsFn
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

    const assetIds = Array.from(state.selectedAssetIds)

    if (assetIds.length === 0) {
      return
    }

    const category = state.selectedCategory
    const shootPath = state.directCategoryShootPath || category.path
    const deleteAssetsPromise = performCategoryAction(async () => {
      await deleteShootAssets({
        data: {
          shootPath,
          selectedFolder: category.path,
          assetIds,
        },
      })

      return await getCategory({ data: { categoryName: category.name } })
    })

    toast.promise(deleteAssetsPromise, {
      loading: "Deleting photos...",
      success: assetIds.length === 1 ? "Photo deleted" : "Photos deleted",
      error: (deleteError: unknown) => getErrorMessage(deleteError),
    })

    void deleteAssetsPromise
      .then(() => {
        clearAssetSelection()

        return undefined
      })
      .catch(() => undefined)
  })
}

function useToggleHomeCarouselAsset({
  setHomeCarouselAsset,
  state,
}: {
  setHomeCarouselAsset: SetHomeCarouselAssetFn
  state: CategoryPageActionState
}) {
  return useStableCallback((assetId: string, selected: boolean) => {
    const previousCategoryPage = state.categoryPage

    state.setCategoryPage({
      ...state.categoryPage,
      assets: state.categoryPage.assets.map((asset) =>
        asset.assetId === assetId
          ? {
              ...asset,
              homeCarouselOrderRank: selected
                ? asset.homeCarouselOrderRank || ASSET_ORDER_STEP
                : undefined,
            }
          : asset
      ),
    })

    void setHomeCarouselAsset({
      data: {
        assetId,
        selected,
      },
    })
      .then(() => {
        toast.success(
          selected
            ? "Homepage carousel photo saved"
            : "Homepage carousel photo removed"
        )

        return undefined
      })
      .catch((homeCarouselError) => {
        state.setCategoryPage(previousCategoryPage)
        toast.error(getErrorMessage(homeCarouselError))

        return undefined
      })
  })
}

export { useCategoryPagePhotoActions }
