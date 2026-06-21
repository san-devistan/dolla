import { getErrorMessage } from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type {
  DeleteFolderFn,
  DeleteShootAssetsFn,
  GetShootFn,
  SetHomeCarouselAssetFn,
  SetShootCoverFn,
  ShootPageActionState,
} from "@/features/cloudinary/shoot/_lib/action-types"
import { getMediaCategoryRoute } from "@/lib/admin-routes"
import type { CloudinaryShootPage } from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import type { AnyRouter } from "@tanstack/react-router"
import { toast } from "@workspace/ui/components/sonner"

function useShootPageAdminActions({
  clearAssetSelection,
  deleteFolder,
  deleteShootAssets,
  getShoot,
  isAdminMode,
  performShootAction,
  router,
  runShootAction,
  setHomeCarouselAsset,
  setShootCover,
  state,
}: {
  clearAssetSelection: () => void
  deleteFolder: DeleteFolderFn
  deleteShootAssets: DeleteShootAssetsFn
  getShoot: GetShootFn
  isAdminMode: boolean
  performShootAction: (
    action: () => Promise<CloudinaryShootPage>
  ) => Promise<CloudinaryShootPage>
  router: AnyRouter
  runShootAction: (
    action: () => Promise<CloudinaryShootPage>,
    successMessage: string
  ) => Promise<boolean>
  setHomeCarouselAsset: SetHomeCarouselAssetFn
  setShootCover: SetShootCoverFn
  state: ShootPageActionState
}) {
  return {
    handleDeleteSelectedAssets: useDeleteSelectedAssets({
      clearAssetSelection,
      deleteShootAssets,
      getShoot,
      performShootAction,
      state,
    }),
    handleDeleteShoot: useDeleteShoot({
      deleteFolder,
      getShoot,
      isAdminMode,
      router,
      runShootAction,
      state,
    }),
    handleSetShootCover: useSetShootCover({ setShootCover, state }),
    handleToggleHomeCarouselAsset: useToggleHomeCarouselAsset({
      setHomeCarouselAsset,
      state,
    }),
  }
}

function useDeleteShoot({
  deleteFolder,
  getShoot,
  isAdminMode,
  router,
  runShootAction,
  state,
}: {
  deleteFolder: DeleteFolderFn
  getShoot: GetShootFn
  isAdminMode: boolean
  router: AnyRouter
  runShootAction: (
    action: () => Promise<CloudinaryShootPage>,
    successMessage: string
  ) => Promise<boolean>
  state: ShootPageActionState
}) {
  return useStableCallback(() => {
    if (!state.categoryFolder || !state.shootFolder) {
      return
    }

    const categoryFolder = state.categoryFolder
    const shootFolder = state.shootFolder

    void runShootAction(async () => {
      await deleteFolder({ data: { folderPath: shootFolder.path } })

      return await getShoot({
        data: {
          categoryName: categoryFolder.name,
          shootName: shootFolder.name,
        },
      })
    }, "Shoot deleted").then((didSucceed) => {
      if (didSucceed) {
        void router
          .navigate({
            to: getMediaCategoryRoute(isAdminMode),
            params: { category: toMediaRouteSegment(categoryFolder.name) },
          })
          .then(() => router.invalidate())
      }

      return undefined
    })
  })
}

function useDeleteSelectedAssets({
  clearAssetSelection,
  deleteShootAssets,
  getShoot,
  performShootAction,
  state,
}: {
  clearAssetSelection: () => void
  deleteShootAssets: DeleteShootAssetsFn
  getShoot: GetShootFn
  performShootAction: (
    action: () => Promise<CloudinaryShootPage>
  ) => Promise<CloudinaryShootPage>
  state: ShootPageActionState
}) {
  return useStableCallback(() => {
    if (!state.categoryFolder || !state.shootFolder) {
      return
    }

    const assetIds = Array.from(state.selectedAssetIds)

    if (assetIds.length === 0) {
      return
    }

    const categoryFolder = state.categoryFolder
    const shootFolder = state.shootFolder
    const deleteAssetsPromise = performShootAction(async () => {
      await deleteShootAssets({
        data: {
          shootPath: shootFolder.path,
          selectedFolder: shootFolder.path,
          assetIds,
        },
      })

      return await getShoot({
        data: {
          categoryName: categoryFolder.name,
          shootName: shootFolder.name,
        },
      })
    })

    toast.promise(deleteAssetsPromise, {
      loading: "Deleting photos...",
      success: assetIds.length === 1 ? "Photo deleted" : "Photos deleted",
      error: (deleteError) => getErrorMessage(deleteError),
    })

    void deleteAssetsPromise
      .then(() => {
        clearAssetSelection()

        return undefined
      })
      .catch(() => undefined)
  })
}

function useSetShootCover({
  setShootCover,
  state,
}: {
  setShootCover: SetShootCoverFn
  state: ShootPageActionState
}) {
  return useStableCallback((assetId: string) => {
    if (!state.shootFolder || state.shootFolder.coverAssetId === assetId) {
      return
    }

    const previousShootPage = state.shootPage

    state.setShootPage({
      ...state.shootPage,
      shoot: {
        ...state.shootFolder,
        coverAssetId: assetId,
      },
    })

    void setShootCover({
      data: {
        shootPath: state.shootFolder.path,
        selectedFolder: state.shootFolder.path,
        assetId,
      },
    })
      .then(() => {
        toast.success("Shoot cover saved")

        return undefined
      })
      .catch((coverError) => {
        state.setShootPage(previousShootPage)
        toast.error(getErrorMessage(coverError))

        return undefined
      })
  })
}

function useToggleHomeCarouselAsset({
  setHomeCarouselAsset,
  state,
}: {
  setHomeCarouselAsset: SetHomeCarouselAssetFn
  state: ShootPageActionState
}) {
  return useStableCallback((assetId: string, selected: boolean) => {
    const previousShootPage = state.shootPage

    state.setShootPage({
      ...state.shootPage,
      assets: state.shootPage.assets.map((asset) =>
        asset.assetId === assetId
          ? {
              ...asset,
              homeCarouselOrderRank: selected
                ? asset.homeCarouselOrderRank || 1000
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
        state.setShootPage(previousShootPage)
        toast.error(getErrorMessage(homeCarouselError))

        return undefined
      })
  })
}

export { useShootPageAdminActions }
