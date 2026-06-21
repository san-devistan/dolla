import type { PhotoMasonryMode } from "@/features/cloudinary/media/_components/photo-masonry"
import type { ShootCreditsMode } from "@/features/cloudinary/shoot/_components/credits"
import type { ShootTitleMode } from "@/features/cloudinary/shoot/_components/title"
import type { ShootPageStateSetters } from "@/features/cloudinary/shoot/_lib/action-types"
import type { ShootPageState } from "@/features/cloudinary/shoot/_lib/state"
import { useMemo } from "react"

type ShootPageModeState = ShootPageState &
  Pick<
    ShootPageStateSetters,
    | "setActiveViewerAssetId"
    | "setCreditsDraft"
    | "setRenameName"
    | "setShootPage"
  >

function useShootTitleMode({
  canRenameShoot,
  canUpload,
  isAdminMode,
  state,
}: {
  canRenameShoot: boolean
  canUpload: boolean
  isAdminMode: boolean
  state: ShootPageModeState
}) {
  return useMemo<ShootTitleMode>(
    () =>
      isAdminMode
        ? {
            type: "admin",
            canDeleteShoot: canRenameShoot,
            canRenameShoot,
            canUpload,
            isBusy: state.isBusy,
            isRenamingShoot: state.isRenamingShoot,
            renameName: state.renameName,
          }
        : { type: "public" },
    [canRenameShoot, canUpload, isAdminMode, state]
  )
}

function useShootCreditsMode({
  canEditCredits,
  isAdminMode,
  state,
}: {
  canEditCredits: boolean
  isAdminMode: boolean
  state: ShootPageModeState
}) {
  return useMemo<ShootCreditsMode>(
    () =>
      isAdminMode
        ? {
            type: "admin",
            canEditCredits,
            creditsDraft: state.creditsDraft,
            isBusy: state.isBusy,
            isEditingCredits: state.isEditingCredits,
          }
        : { type: "public" },
    [canEditCredits, isAdminMode, state]
  )
}

function usePhotoMasonryMode({
  canOrganizeAssets,
  isAdminMode,
  state,
}: {
  canOrganizeAssets: boolean
  isAdminMode: boolean
  state: ShootPageModeState
}) {
  return useMemo<PhotoMasonryMode>(
    () =>
      isAdminMode
        ? {
            type: "admin",
            canOrganizeAssets,
            draggingAssetId: state.draggingAssetId,
            dropTarget: state.dropTarget,
            isBusy: state.isBusy,
            selectedAssetIds: state.selectedAssetIds,
            showCoverControl: true,
          }
        : { type: "public" },
    [canOrganizeAssets, isAdminMode, state]
  )
}

export { usePhotoMasonryMode, useShootCreditsMode, useShootTitleMode }
