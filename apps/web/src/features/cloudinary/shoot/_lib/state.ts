import type { AssetDropTarget } from "@/features/cloudinary/media/_lib/asset-layout"
import type { ShootPageStateSetters } from "@/features/cloudinary/shoot/_lib/action-types"
import type { CloudinaryShootPage } from "@/lib/cloudinary.server"
import { useMemo, useReducer } from "react"

type ShootPageState = {
  activeViewerAssetId: string | null
  creditsDraft: string
  draggingAssetId: string | null
  dropTarget: AssetDropTarget | null
  isBusy: boolean
  isEditingCredits: boolean
  isRenamingShoot: boolean
  renameName: string
  selectedAssetIds: Set<string>
  shootPage: CloudinaryShootPage
}

type ShootPageStateAction = (state: ShootPageState) => ShootPageState

function useShootPageState(initialShootPage: CloudinaryShootPage) {
  const [state, dispatch] = useReducer(
    shootPageStateReducer,
    initialShootPage,
    createShootPageInitialState
  )
  const setters = useMemo<ShootPageStateSetters>(
    () => ({
      setActiveViewerAssetId: (value) =>
        dispatch((current) => ({
          ...current,
          activeViewerAssetId:
            typeof value === "function"
              ? value(current.activeViewerAssetId)
              : value,
        })),
      setCreditsDraft: (value) =>
        dispatch((current) => ({
          ...current,
          creditsDraft:
            typeof value === "function" ? value(current.creditsDraft) : value,
        })),
      setDraggingAssetId: (value) =>
        dispatch((current) => ({
          ...current,
          draggingAssetId:
            typeof value === "function"
              ? value(current.draggingAssetId)
              : value,
        })),
      setDropTarget: (value) =>
        dispatch((current) => ({
          ...current,
          dropTarget:
            typeof value === "function" ? value(current.dropTarget) : value,
        })),
      setIsBusy: (value) =>
        dispatch((current) => ({
          ...current,
          isBusy: typeof value === "function" ? value(current.isBusy) : value,
        })),
      setIsEditingCredits: (value) =>
        dispatch((current) => ({
          ...current,
          isEditingCredits:
            typeof value === "function"
              ? value(current.isEditingCredits)
              : value,
        })),
      setIsRenamingShoot: (value) =>
        dispatch((current) => ({
          ...current,
          isRenamingShoot:
            typeof value === "function"
              ? value(current.isRenamingShoot)
              : value,
        })),
      setRenameName: (value) =>
        dispatch((current) => ({
          ...current,
          renameName:
            typeof value === "function" ? value(current.renameName) : value,
        })),
      setSelectedAssetIds: (value) =>
        dispatch((current) => ({
          ...current,
          selectedAssetIds:
            typeof value === "function"
              ? value(current.selectedAssetIds)
              : value,
        })),
      setShootPage: (value) =>
        dispatch((current) => ({
          ...current,
          shootPage:
            typeof value === "function" ? value(current.shootPage) : value,
        })),
    }),
    []
  )

  return { ...state, ...setters }
}

function createShootPageInitialState(
  initialShootPage: CloudinaryShootPage
): ShootPageState {
  return {
    activeViewerAssetId: null,
    creditsDraft: initialShootPage.shoot?.credits || "",
    draggingAssetId: null,
    dropTarget: null,
    isBusy: false,
    isEditingCredits: false,
    isRenamingShoot: false,
    renameName: initialShootPage.shoot?.name || "",
    selectedAssetIds: new Set(),
    shootPage: initialShootPage,
  }
}

function shootPageStateReducer(
  state: ShootPageState,
  action: ShootPageStateAction
): ShootPageState {
  return action(state)
}

export { useShootPageState }
export type { ShootPageState }
