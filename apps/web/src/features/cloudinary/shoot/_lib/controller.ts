import {
  deleteCloudinaryFolderFn,
  deleteCloudinaryShootAssetsFn,
  getCloudinaryShootFn,
  renameCloudinaryFolderFn,
  reorderCloudinaryAssetsFn,
  setCloudinaryHomeCarouselAssetFn,
  setCloudinaryShootCoverFn,
  setCloudinaryShootCreditsFn,
} from "@/features/cloudinary/data/functions"
import type {
  PhotoMasonryHandlers,
  PhotoMasonryMode,
} from "@/features/cloudinary/media/_components/photo-masonry"
import { useMasonryColumnCount } from "@/features/cloudinary/media/_lib/asset-layout"
import type { ShootCreditsMode } from "@/features/cloudinary/shoot/_components/credits"
import type { ShootTitleMode } from "@/features/cloudinary/shoot/_components/title"
import { useShootPageActionRunner } from "@/features/cloudinary/shoot/_lib/action-runner"
import { useShootPageAdminActions } from "@/features/cloudinary/shoot/_lib/admin-actions"
import { useShootPageCreditActions } from "@/features/cloudinary/shoot/_lib/credit-actions"
import {
  usePhotoMasonryMode,
  useShootCreditsMode,
  useShootTitleMode,
} from "@/features/cloudinary/shoot/_lib/modes"
import { useShootPageOrderActions } from "@/features/cloudinary/shoot/_lib/order-actions"
import { useShootPageRenameActions } from "@/features/cloudinary/shoot/_lib/rename-actions"
import { useShootPageSelectionActions } from "@/features/cloudinary/shoot/_lib/selection-actions"
import { useShootPageState } from "@/features/cloudinary/shoot/_lib/state"
import { useShootPageUploadActions } from "@/features/cloudinary/shoot/_lib/upload-actions"
import type {
  CloudinaryFolder,
  CloudinaryShootPage,
} from "@/lib/cloudinary.server"
import { useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { type RefObject, useMemo, useRef } from "react"

type ShootPageController = {
  actions: ReturnType<typeof useShootPageActions>
  activeViewerAssetId: string | null
  canDeleteSelectedAssets: boolean
  categoryFolder: CloudinaryFolder | undefined
  isAdminMode: boolean
  isBusy: boolean
  masonryColumnCount: number
  photoMasonryHandlers: PhotoMasonryHandlers
  photoMasonryMode: PhotoMasonryMode
  selectedAssetIds: Set<string>
  shootCreditsMode: ShootCreditsMode
  shootFolder: CloudinaryFolder | undefined
  shootPage: CloudinaryShootPage
  shootTitleMode: ShootTitleMode
  uploadInputRef: RefObject<HTMLInputElement | null>
}

function useShootPageController({
  initialShootPage,
  isAdminMode,
}: {
  initialShootPage: CloudinaryShootPage
  isAdminMode: boolean
}): ShootPageController {
  const router = useRouter()
  const state = useShootPageState(initialShootPage)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const masonryColumnCount = useMasonryColumnCount()
  const serverFns = useShootPageServerFns()
  const categoryFolder = state.shootPage.category || undefined
  const shootFolder = state.shootPage.shoot || undefined
  const folders = useMemo(
    () => ({ categoryFolder, shootFolder }),
    [categoryFolder, shootFolder]
  )
  const canMutate = getCanMutate(state.shootPage, state.isBusy)
  const canUpload = canMutate && Boolean(shootFolder)
  const canOrganizeAssets = canMutate && Boolean(shootFolder)
  const canRenameShoot = canMutate && Boolean(shootFolder)
  const canEditCredits = canMutate && Boolean(shootFolder)
  const canDeleteSelectedAssets = canMutate && state.selectedAssetIds.size > 0
  const actionState = {
    ...state,
    categoryFolder,
    isAdminMode,
    masonryColumnCount,
    shootFolder,
  }
  const actionRunner = useShootPageActionRunner(state)
  const selectionActions = useShootPageSelectionActions(state)
  const actions = useShootPageActions({
    actionRunner,
    actionState,
    canOrganizeAssets,
    folders,
    isAdminMode,
    router,
    selectionActions,
    serverFns,
    state,
    uploadInputRef,
  })

  return {
    actions,
    activeViewerAssetId: state.activeViewerAssetId,
    canDeleteSelectedAssets,
    categoryFolder,
    isAdminMode,
    isBusy: state.isBusy,
    masonryColumnCount,
    photoMasonryHandlers: usePhotoMasonryHandlers({
      actions,
      selectionActions,
    }),
    photoMasonryMode: usePhotoMasonryMode({
      canOrganizeAssets,
      isAdminMode,
      state,
    }),
    selectedAssetIds: state.selectedAssetIds,
    shootCreditsMode: useShootCreditsMode({
      canEditCredits,
      isAdminMode,
      state,
    }),
    shootFolder,
    shootPage: state.shootPage,
    shootTitleMode: useShootTitleMode({
      canRenameShoot,
      canUpload,
      isAdminMode,
      state,
    }),
    uploadInputRef,
  }
}

function useShootPageServerFns() {
  return {
    deleteFolder: useServerFn(deleteCloudinaryFolderFn),
    deleteShootAssets: useServerFn(deleteCloudinaryShootAssetsFn),
    getShoot: useServerFn(getCloudinaryShootFn),
    renameFolder: useServerFn(renameCloudinaryFolderFn),
    reorderAssets: useServerFn(reorderCloudinaryAssetsFn),
    setHomeCarouselAsset: useServerFn(setCloudinaryHomeCarouselAssetFn),
    setShootCover: useServerFn(setCloudinaryShootCoverFn),
    setShootCredits: useServerFn(setCloudinaryShootCreditsFn),
  }
}

function useShootPageActions({
  actionRunner,
  actionState,
  canOrganizeAssets,
  folders,
  isAdminMode,
  router,
  selectionActions,
  serverFns,
  state,
  uploadInputRef,
}: {
  actionRunner: ReturnType<typeof useShootPageActionRunner>
  actionState: Parameters<typeof useShootPageOrderActions>[0]["state"]
  canOrganizeAssets: boolean
  folders: {
    categoryFolder: CloudinaryFolder | undefined
    shootFolder: CloudinaryFolder | undefined
  }
  isAdminMode: boolean
  router: ReturnType<typeof useRouter>
  selectionActions: ReturnType<typeof useShootPageSelectionActions>
  serverFns: ReturnType<typeof useShootPageServerFns>
  state: ReturnType<typeof useShootPageState>
  uploadInputRef: RefObject<HTMLInputElement | null>
}) {
  const uploadActions = useShootPageUploadActions({
    folders,
    getShoot: serverFns.getShoot,
    setters: state,
    uploadInputRef,
  })
  const renameActions = useShootPageRenameActions({
    folders,
    getShoot: serverFns.getShoot,
    isAdminMode,
    performShootAction: actionRunner.performShootAction,
    renameFolder: serverFns.renameFolder,
    renameName: state.renameName,
    router,
    setters: state,
  })
  const creditActions = useShootPageCreditActions({
    creditsDraft: state.creditsDraft,
    folders,
    getShoot: serverFns.getShoot,
    performShootAction: actionRunner.performShootAction,
    setShootCredits: serverFns.setShootCredits,
    setters: state,
  })
  const orderActions = useShootPageOrderActions({
    canOrganizeAssets,
    reorderAssets: serverFns.reorderAssets,
    state: actionState,
  })
  const adminActions = useShootPageAdminActions({
    clearAssetSelection: selectionActions.clearAssetSelection,
    deleteFolder: serverFns.deleteFolder,
    deleteShootAssets: serverFns.deleteShootAssets,
    getShoot: serverFns.getShoot,
    isAdminMode,
    performShootAction: actionRunner.performShootAction,
    router,
    runShootAction: actionRunner.runShootAction,
    setHomeCarouselAsset: serverFns.setHomeCarouselAsset,
    setShootCover: serverFns.setShootCover,
    state: actionState,
  })

  return {
    ...adminActions,
    ...creditActions,
    ...orderActions,
    ...renameActions,
    ...selectionActions,
    ...uploadActions,
    setActiveViewerAssetId: state.setActiveViewerAssetId,
    setCreditsDraft: state.setCreditsDraft,
    setRenameName: state.setRenameName,
  }
}

function getCanMutate(shootPage: CloudinaryShootPage, isBusy: boolean) {
  return (
    shootPage.connection.configured && !shootPage.connection.error && !isBusy
  )
}

function usePhotoMasonryHandlers({
  actions,
  selectionActions,
}: {
  actions: ReturnType<typeof useShootPageActions>
  selectionActions: ReturnType<typeof useShootPageSelectionActions>
}) {
  return useMemo<PhotoMasonryHandlers>(
    () => ({
      onAssetDragEnd: actions.handleAssetDragEnd,
      onAssetDragOver: actions.handleAssetDragOver,
      onAssetDragStart: actions.handleAssetDragStart,
      onAssetDrop: actions.handleAssetDrop,
      onAssetInsertionDragOver: actions.handleAssetInsertionDragOver,
      onAssetSelectionChange: selectionActions.toggleAssetSelection,
      onColumnDragOver: actions.handleColumnDragOver,
      onColumnDrop: actions.handleColumnDrop,
      onOpenAsset: selectionActions.openAssetViewer,
      onSetShootCover: actions.handleSetShootCover,
      onToggleHomeCarouselAsset: actions.handleToggleHomeCarouselAsset,
    }),
    [actions, selectionActions]
  )
}

export { useShootPageController }
export type { ShootPageController }
