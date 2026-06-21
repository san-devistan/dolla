import type { AssetDropTarget } from "@/features/cloudinary/media/_lib/asset-layout"
import type {
  CloudinaryFolder,
  CloudinaryShootPage,
} from "@/lib/cloudinary.server"
import type { Dispatch, SetStateAction } from "react"

type GetShootFn = (args: {
  data: {
    categoryName: string
    shootName: string
  }
}) => Promise<CloudinaryShootPage>

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

type SetShootCoverFn = (args: {
  data: {
    assetId: string
    selectedFolder: string
    shootPath: string
  }
}) => Promise<unknown>

type SetHomeCarouselAssetFn = (args: {
  data: {
    assetId: string
    selected: boolean
  }
}) => Promise<unknown>

type SetShootCreditsFn = (args: {
  data: {
    credits: string
    shootPath: string
  }
}) => Promise<unknown>

type ShootPageFolders = {
  categoryFolder: CloudinaryFolder | undefined
  shootFolder: CloudinaryFolder | undefined
}

type ShootPageStateSetters = {
  setActiveViewerAssetId: Dispatch<SetStateAction<string | null>>
  setCreditsDraft: Dispatch<SetStateAction<string>>
  setDraggingAssetId: Dispatch<SetStateAction<string | null>>
  setDropTarget: Dispatch<SetStateAction<AssetDropTarget | null>>
  setIsBusy: Dispatch<SetStateAction<boolean>>
  setIsEditingCredits: Dispatch<SetStateAction<boolean>>
  setIsRenamingShoot: Dispatch<SetStateAction<boolean>>
  setRenameName: Dispatch<SetStateAction<string>>
  setSelectedAssetIds: Dispatch<SetStateAction<Set<string>>>
  setShootPage: Dispatch<SetStateAction<CloudinaryShootPage>>
}

type ShootPageActionState = ShootPageFolders &
  ShootPageStateSetters & {
    creditsDraft: string
    draggingAssetId: string | null
    dropTarget: AssetDropTarget | null
    isAdminMode: boolean
    masonryColumnCount: number
    renameName: string
    selectedAssetIds: Set<string>
    shootPage: CloudinaryShootPage
  }

export type {
  DeleteFolderFn,
  DeleteShootAssetsFn,
  GetShootFn,
  RenameFolderFn,
  ReorderAssetsFn,
  SetHomeCarouselAssetFn,
  SetShootCoverFn,
  SetShootCreditsFn,
  ShootPageActionState,
  ShootPageFolders,
  ShootPageStateSetters,
}
