import type { AssetDropTarget } from "@/features/cloudinary/media/_lib/asset-layout"
import type {
  CloudinaryCategoryPage,
  CloudinaryFolder,
} from "@/lib/cloudinary.server"
import type { Dispatch, SetStateAction } from "react"

type ShootDropTarget = {
  shootPath: string
}

type GetCategoryFn = (args: {
  data: {
    categoryName: string
  }
}) => Promise<CloudinaryCategoryPage>

type CreateFolderFn = (args: {
  data: {
    name: string
    parentPath: string
  }
}) => Promise<{ selectedFolder: string }>

type RenameFolderFn = (args: {
  data: {
    folderPath: string
    name: string
  }
}) => Promise<unknown>

type DeleteFolderFn = (args: {
  data: {
    folderPath: string
  }
}) => Promise<unknown>

type DeleteShootAssetsFn = (args: {
  data: {
    assetIds: string[]
    selectedFolder: string
    shootPath: string
  }
}) => Promise<unknown>

type MoveShootsFn = (args: {
  data: {
    selectedFolder: string
    shootPaths: string[]
    targetCategoryPath: string
  }
}) => Promise<unknown>

type ReorderAssetsFn = (args: {
  data: {
    assetIds: string[]
    assetLayouts: Array<{
      assetId: string
      layoutColumn: number
      layoutColumnCount: number
      layoutOrder: number
    }>
    selectedFolder: string
    shootPath: string
  }
}) => Promise<unknown>

type ReorderShootsFn = (args: {
  data: {
    categoryPath: string
    selectedFolder: string
    shootPaths: string[]
  }
}) => Promise<unknown>

type SetCategoryCoverFn = (args: {
  data: {
    categoryPath: string
    selectedFolder: string
    shootPath: string
  }
}) => Promise<unknown>

type SetCategoryDescriptionFn = (args: {
  data: {
    categoryPath: string
    description: string
  }
}) => Promise<unknown>

type SetHomeCarouselAssetFn = (args: {
  data: {
    assetId: string
    selected: boolean
  }
}) => Promise<unknown>

type CategoryPageStateSetters = {
  setActiveViewerAssetId: Dispatch<SetStateAction<string | null>>
  setAssetDropTarget: Dispatch<SetStateAction<AssetDropTarget | null>>
  setCategoryPage: Dispatch<SetStateAction<CloudinaryCategoryPage>>
  setCreateShootFiles: Dispatch<SetStateAction<File[]>>
  setCreateShootName: Dispatch<SetStateAction<string>>
  setDescriptionDraft: Dispatch<SetStateAction<string>>
  setDraggingAssetId: Dispatch<SetStateAction<string | null>>
  setDraggingShootPath: Dispatch<SetStateAction<string | null>>
  setIsBusy: Dispatch<SetStateAction<boolean>>
  setIsCreateShootDialogOpen: Dispatch<SetStateAction<boolean>>
  setIsRenamingCategory: Dispatch<SetStateAction<boolean>>
  setMoveTargetCategoryPath: Dispatch<SetStateAction<string>>
  setRenameName: Dispatch<SetStateAction<string>>
  setSelectedAssetIds: Dispatch<SetStateAction<Set<string>>>
  setSelectedShootPaths: Dispatch<SetStateAction<Set<string>>>
  setShootDropTarget: Dispatch<SetStateAction<ShootDropTarget | null>>
}

type CategoryPageFolders = {
  directCategoryShootPath: string | undefined
  selectedCategory: CloudinaryFolder | undefined
}

type CategoryPageActionState = CategoryPageFolders &
  CategoryPageStateSetters & {
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
    masonryColumnCount: number
    moveTargetCategories: CloudinaryCategoryPage["categories"]
    moveTargetCategoryPath: string
    renameName: string
    selectedAssetIds: Set<string>
    selectedShootPaths: Set<string>
    shootDropTarget: ShootDropTarget | null
  }

export type {
  CategoryPageActionState,
  CategoryPageFolders,
  CategoryPageStateSetters,
  CreateFolderFn,
  DeleteFolderFn,
  DeleteShootAssetsFn,
  GetCategoryFn,
  MoveShootsFn,
  RenameFolderFn,
  ReorderAssetsFn,
  ReorderShootsFn,
  SetCategoryCoverFn,
  SetCategoryDescriptionFn,
  SetHomeCarouselAssetFn,
  ShootDropTarget,
}
