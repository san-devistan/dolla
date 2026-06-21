import { useCategoryPageActionRunner } from "@/features/cloudinary/category/_lib/action-runner"
import { useCategoryPageCreateShootActions } from "@/features/cloudinary/category/_lib/create-shoot-actions"
import { useCategoryPageEditActions } from "@/features/cloudinary/category/_lib/edit-actions"
import { useCategoryPagePhotoActions } from "@/features/cloudinary/category/_lib/photo-actions"
import { useCategoryPageShootActions } from "@/features/cloudinary/category/_lib/shoot-actions"
import { useCategoryPageState } from "@/features/cloudinary/category/_lib/state"
import { getEffectiveMoveTargetCategoryPath } from "@/features/cloudinary/category/_lib/utils"
import {
  createCloudinaryFolderFn,
  deleteCloudinaryFolderFn,
  deleteCloudinaryShootAssetsFn,
  getCloudinaryCategoryFn,
  moveCloudinaryShootsFn,
  renameCloudinaryFolderFn,
  reorderCloudinaryAssetsFn,
  reorderCloudinaryShootsFn,
  setCloudinaryCategoryCoverFn,
  setCloudinaryCategoryDescriptionFn,
  setCloudinaryHomeCarouselAssetFn,
} from "@/features/cloudinary/data/functions"
import { useMasonryColumnCount } from "@/features/cloudinary/media/_lib/asset-layout"
import type {
  CloudinaryCategoryPage,
  CloudinaryFolder,
} from "@/lib/cloudinary.server"
import { isDirectPhotoCategoryName } from "@/lib/direct-photo-category"
import { useRouter, useRouterState } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { type RefObject, useMemo, useRef } from "react"

type CategoryPageController = {
  actions: ReturnType<typeof useCategoryPageActions>
  assets: CloudinaryCategoryPage["assets"]
  canCreateShoot: boolean
  canDeleteSelectedAssets: boolean
  canDeleteSelectedShoots: boolean
  canEditCategoryDescription: boolean
  canMoveSelectedShoots: boolean
  canOrganizeCategoryPhotos: boolean
  canOrganizeShoots: boolean
  canRenameCategory: boolean
  canUploadCategoryPhotos: boolean
  categoryPage: CloudinaryCategoryPage
  directCategoryShootPath: string | undefined
  effectiveMoveTargetCategoryPath: string
  hasShootSegment: boolean
  isAdminMode: boolean
  isBusy: boolean
  isDirectPhotoCategory: boolean
  masonryColumnCount: number
  moveTargetCategories: CloudinaryCategoryPage["categories"]
  selectedCategory: CloudinaryFolder | undefined
  shoots: CloudinaryCategoryPage["shoots"]
  state: ReturnType<typeof useCategoryPageState>
  uploadInputRef: RefObject<HTMLInputElement | null>
}

function useCategoryPageController({
  category,
  initialCategoryPage,
  isAdminMode,
}: {
  category: string
  initialCategoryPage: CloudinaryCategoryPage
  isAdminMode: boolean
}): CategoryPageController {
  const router = useRouter()
  const hasShootSegment = useHasShootSegment(isAdminMode)
  const state = useCategoryPageState(initialCategoryPage)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const masonryColumnCount = useMasonryColumnCount()
  const serverFns = useCategoryPageServerFns()
  const derived = useCategoryPageDerivedState({
    isBusy: state.isBusy,
    categoryPage: state.categoryPage,
    moveTargetCategoryPath: state.moveTargetCategoryPath,
    selectedAssetIds: state.selectedAssetIds,
    selectedShootPaths: state.selectedShootPaths,
  })
  const actionState = {
    ...state,
    directCategoryShootPath: derived.directCategoryShootPath,
    masonryColumnCount,
    moveTargetCategories: derived.moveTargetCategories,
    selectedCategory: derived.selectedCategory,
  }
  const actionRunner = useCategoryPageActionRunner(state)
  const actions = useCategoryPageActions({
    actionRunner,
    actionState,
    canOrganizeCategoryPhotos: derived.canOrganizeCategoryPhotos,
    canOrganizeShoots: derived.canOrganizeShoots,
    category,
    isAdminMode,
    router,
    serverFns,
    uploadInputRef,
  })

  return {
    actions,
    assets: state.categoryPage.assets,
    categoryPage: state.categoryPage,
    hasShootSegment,
    isAdminMode,
    isBusy: state.isBusy,
    masonryColumnCount,
    shoots: state.categoryPage.shoots,
    state,
    uploadInputRef,
    ...derived,
  }
}

function useHasShootSegment(isAdminMode: boolean) {
  return useRouterState({
    select: (state) =>
      state.location.pathname.split("/").filter(Boolean).length >
      (isAdminMode ? 2 : 1),
  })
}

function useCategoryPageServerFns() {
  return {
    createFolder: useServerFn(createCloudinaryFolderFn),
    deleteFolder: useServerFn(deleteCloudinaryFolderFn),
    deleteShootAssets: useServerFn(deleteCloudinaryShootAssetsFn),
    getCategory: useServerFn(getCloudinaryCategoryFn),
    moveShoots: useServerFn(moveCloudinaryShootsFn),
    renameFolder: useServerFn(renameCloudinaryFolderFn),
    reorderAssets: useServerFn(reorderCloudinaryAssetsFn),
    reorderShoots: useServerFn(reorderCloudinaryShootsFn),
    setCategoryCover: useServerFn(setCloudinaryCategoryCoverFn),
    setCategoryDescription: useServerFn(setCloudinaryCategoryDescriptionFn),
    setHomeCarouselAsset: useServerFn(setCloudinaryHomeCarouselAssetFn),
  }
}

function useCategoryPageActions({
  actionRunner,
  actionState,
  canOrganizeCategoryPhotos,
  canOrganizeShoots,
  category,
  isAdminMode,
  router,
  serverFns,
  uploadInputRef,
}: {
  actionRunner: ReturnType<typeof useCategoryPageActionRunner>
  actionState: Parameters<typeof useCategoryPagePhotoActions>[0]["state"]
  canOrganizeCategoryPhotos: boolean
  canOrganizeShoots: boolean
  category: string
  isAdminMode: boolean
  router: ReturnType<typeof useRouter>
  serverFns: ReturnType<typeof useCategoryPageServerFns>
  uploadInputRef: RefObject<HTMLInputElement | null>
}) {
  const createShootActions = useCategoryPageCreateShootActions({
    createFolder: serverFns.createFolder,
    getCategory: serverFns.getCategory,
    isAdminMode,
    performCategoryAction: actionRunner.performCategoryAction,
    router,
    state: actionState,
  })
  const editActions = useCategoryPageEditActions({
    categoryRouteName: category,
    deleteFolder: serverFns.deleteFolder,
    getCategory: serverFns.getCategory,
    isAdminMode,
    performCategoryAction: actionRunner.performCategoryAction,
    renameFolder: serverFns.renameFolder,
    router,
    runCategoryAction: actionRunner.runCategoryAction,
    setCategoryDescription: serverFns.setCategoryDescription,
    state: actionState,
  })
  const shootActions = useCategoryPageShootActions({
    canOrganizeShoots,
    deleteFolder: serverFns.deleteFolder,
    getCategory: serverFns.getCategory,
    moveShoots: serverFns.moveShoots,
    performCategoryAction: actionRunner.performCategoryAction,
    reorderShoots: serverFns.reorderShoots,
    setCategoryCover: serverFns.setCategoryCover,
    state: actionState,
  })
  const photoActions = useCategoryPagePhotoActions({
    canOrganizeCategoryPhotos,
    deleteShootAssets: serverFns.deleteShootAssets,
    getCategory: serverFns.getCategory,
    performCategoryAction: actionRunner.performCategoryAction,
    reorderAssets: serverFns.reorderAssets,
    setHomeCarouselAsset: serverFns.setHomeCarouselAsset,
    state: actionState,
    uploadInputRef,
  })

  return {
    ...createShootActions,
    ...editActions,
    ...photoActions,
    ...shootActions,
    setActiveViewerAssetId: actionState.setActiveViewerAssetId,
    setCreateShootName: actionState.setCreateShootName,
    setDescriptionDraft: actionState.setDescriptionDraft,
    setMoveTargetCategoryPath: actionState.setMoveTargetCategoryPath,
    setRenameName: actionState.setRenameName,
  }
}

function useCategoryPageDerivedState({
  categoryPage,
  isBusy,
  moveTargetCategoryPath,
  selectedAssetIds,
  selectedShootPaths,
}: {
  categoryPage: CloudinaryCategoryPage
  isBusy: boolean
  moveTargetCategoryPath: string
  selectedAssetIds: Set<string>
  selectedShootPaths: Set<string>
}) {
  return useMemo(
    () =>
      deriveCategoryPageState({
        categoryPage,
        isBusy,
        moveTargetCategoryPath,
        selectedAssetIds,
        selectedShootPaths,
      }),
    [
      categoryPage,
      isBusy,
      moveTargetCategoryPath,
      selectedAssetIds,
      selectedShootPaths,
    ]
  )
}

function deriveCategoryPageState({
  categoryPage,
  isBusy,
  moveTargetCategoryPath,
  selectedAssetIds,
  selectedShootPaths,
}: {
  categoryPage: CloudinaryCategoryPage
  isBusy: boolean
  moveTargetCategoryPath: string
  selectedAssetIds: Set<string>
  selectedShootPaths: Set<string>
}) {
  const selectedCategory = categoryPage.category || undefined
  const selectedCategoryPath = selectedCategory?.path
  const isDirectPhotoCategory = isDirectPhotoCategoryName(
    selectedCategory?.name
  )
  const moveTargetCategories = getMoveTargetCategories(
    categoryPage,
    selectedCategoryPath
  )

  return {
    ...getCategoryCapabilities({
      categoryPage,
      isBusy,
      isDirectPhotoCategory,
      moveTargetCategories,
      selectedAssetIds,
      selectedCategory,
      selectedShootPaths,
    }),
    directCategoryShootPath:
      selectedCategory?.coverShootPath ||
      categoryPage.assets[0]?.folder ||
      selectedCategoryPath,
    effectiveMoveTargetCategoryPath: getEffectiveMoveTargetCategoryPath(
      moveTargetCategories,
      moveTargetCategoryPath
    ),
    isDirectPhotoCategory,
    moveTargetCategories,
    selectedCategory,
  }
}

function getMoveTargetCategories(
  categoryPage: CloudinaryCategoryPage,
  selectedCategoryPath: string | undefined
) {
  if (!selectedCategoryPath) {
    return []
  }

  return categoryPage.categories.filter(
    (categorySummary) =>
      categorySummary.path !== selectedCategoryPath &&
      !categorySummary.isDirectPhotoCategory
  )
}

function getCategoryCapabilities({
  categoryPage,
  isBusy,
  isDirectPhotoCategory,
  moveTargetCategories,
  selectedAssetIds,
  selectedCategory,
  selectedShootPaths,
}: {
  categoryPage: CloudinaryCategoryPage
  isBusy: boolean
  isDirectPhotoCategory: boolean
  moveTargetCategories: CloudinaryCategoryPage["categories"]
  selectedAssetIds: Set<string>
  selectedCategory: CloudinaryFolder | undefined
  selectedShootPaths: Set<string>
}) {
  const canMutate = all(
    categoryPage.connection.configured,
    !categoryPage.connection.error,
    !isBusy
  )
  const hasCategory = Boolean(selectedCategory)
  const canEditFolder = all(canMutate, hasCategory, !isDirectPhotoCategory)
  const canUploadCategoryPhotos = all(
    canMutate,
    hasCategory,
    isDirectPhotoCategory
  )

  return {
    canCreateShoot: canEditFolder,
    canDeleteSelectedAssets: all(canMutate, selectedAssetIds.size > 0),
    canDeleteSelectedShoots: all(canMutate, selectedShootPaths.size > 0),
    canEditCategoryDescription: all(canMutate, hasCategory),
    canMoveSelectedShoots: all(
      canMutate,
      selectedShootPaths.size > 0,
      moveTargetCategories.length > 0
    ),
    canOrganizeCategoryPhotos: canUploadCategoryPhotos,
    canOrganizeShoots: all(
      canMutate,
      selectedCategory?.orderRank !== undefined,
      !isDirectPhotoCategory
    ),
    canRenameCategory: canEditFolder,
    canUploadCategoryPhotos,
  }
}

function all(...conditions: boolean[]) {
  return conditions.every(Boolean)
}

export { useCategoryPageController }
export type { CategoryPageController }
