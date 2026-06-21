import type {
  CategoryPageStateSetters,
  ShootDropTarget,
} from "@/features/cloudinary/category/_lib/action-types"
import { getEditableCategoryDescription } from "@/features/cloudinary/category/_lib/utils"
import type { AssetDropTarget } from "@/features/cloudinary/media/_lib/asset-layout"
import type { CloudinaryCategoryPage } from "@/lib/cloudinary.server"
import { useMemo, useReducer } from "react"

type CategoryPageState = {
  activeViewerAssetId: string | null
  assetDropTarget: AssetDropTarget | null
  categoryPage: CloudinaryCategoryPage
  createShootFiles: File[]
  createShootName: string
  descriptionDraft: string
  draggingAssetId: string | null
  draggingShootPath: string | null
  isBusy: boolean
  isCreateShootDialogOpen: boolean
  isRenamingCategory: boolean
  moveTargetCategoryPath: string
  renameName: string
  selectedAssetIds: Set<string>
  selectedShootPaths: Set<string>
  shootDropTarget: ShootDropTarget | null
}

type CategoryPageStateAction = (state: CategoryPageState) => CategoryPageState

function useCategoryPageState(initialCategoryPage: CloudinaryCategoryPage) {
  const [state, dispatch] = useReducer(
    categoryPageStateReducer,
    initialCategoryPage,
    createCategoryPageInitialState
  )
  const setters = useMemo<CategoryPageStateSetters>(
    () => ({
      setActiveViewerAssetId: (value) =>
        dispatch((current) => ({
          ...current,
          activeViewerAssetId:
            typeof value === "function"
              ? value(current.activeViewerAssetId)
              : value,
        })),
      setAssetDropTarget: (value) =>
        dispatch((current) => ({
          ...current,
          assetDropTarget:
            typeof value === "function"
              ? value(current.assetDropTarget)
              : value,
        })),
      setCategoryPage: (value) =>
        dispatch((current) => ({
          ...current,
          categoryPage:
            typeof value === "function" ? value(current.categoryPage) : value,
        })),
      setCreateShootFiles: (value) =>
        dispatch((current) => ({
          ...current,
          createShootFiles:
            typeof value === "function"
              ? value(current.createShootFiles)
              : value,
        })),
      setCreateShootName: (value) =>
        dispatch((current) => ({
          ...current,
          createShootName:
            typeof value === "function"
              ? value(current.createShootName)
              : value,
        })),
      setDescriptionDraft: (value) =>
        dispatch((current) => ({
          ...current,
          descriptionDraft:
            typeof value === "function"
              ? value(current.descriptionDraft)
              : value,
        })),
      setDraggingAssetId: (value) =>
        dispatch((current) => ({
          ...current,
          draggingAssetId:
            typeof value === "function"
              ? value(current.draggingAssetId)
              : value,
        })),
      setDraggingShootPath: (value) =>
        dispatch((current) => ({
          ...current,
          draggingShootPath:
            typeof value === "function"
              ? value(current.draggingShootPath)
              : value,
        })),
      setIsBusy: (value) =>
        dispatch((current) => ({
          ...current,
          isBusy: typeof value === "function" ? value(current.isBusy) : value,
        })),
      setIsCreateShootDialogOpen: (value) =>
        dispatch((current) => ({
          ...current,
          isCreateShootDialogOpen:
            typeof value === "function"
              ? value(current.isCreateShootDialogOpen)
              : value,
        })),
      setIsRenamingCategory: (value) =>
        dispatch((current) => ({
          ...current,
          isRenamingCategory:
            typeof value === "function"
              ? value(current.isRenamingCategory)
              : value,
        })),
      setMoveTargetCategoryPath: (value) =>
        dispatch((current) => ({
          ...current,
          moveTargetCategoryPath:
            typeof value === "function"
              ? value(current.moveTargetCategoryPath)
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
      setSelectedShootPaths: (value) =>
        dispatch((current) => ({
          ...current,
          selectedShootPaths:
            typeof value === "function"
              ? value(current.selectedShootPaths)
              : value,
        })),
      setShootDropTarget: (value) =>
        dispatch((current) => ({
          ...current,
          shootDropTarget:
            typeof value === "function"
              ? value(current.shootDropTarget)
              : value,
        })),
    }),
    []
  )

  return { ...state, ...setters }
}

function createCategoryPageInitialState(
  initialCategoryPage: CloudinaryCategoryPage
): CategoryPageState {
  return {
    activeViewerAssetId: null,
    assetDropTarget: null,
    categoryPage: initialCategoryPage,
    createShootFiles: [],
    createShootName: "",
    descriptionDraft: getEditableCategoryDescription(
      initialCategoryPage.category || undefined
    ),
    draggingAssetId: null,
    draggingShootPath: null,
    isBusy: false,
    isCreateShootDialogOpen: false,
    isRenamingCategory: false,
    moveTargetCategoryPath: "",
    renameName: initialCategoryPage.category?.name || "",
    selectedAssetIds: new Set(),
    selectedShootPaths: new Set(),
    shootDropTarget: null,
  }
}

function categoryPageStateReducer(
  state: CategoryPageState,
  action: CategoryPageStateAction
): CategoryPageState {
  return action(state)
}

export { useCategoryPageState }
export type { CategoryPageState }
