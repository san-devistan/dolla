import type {
  AssetDropPosition,
  AssetDropTarget,
} from "@/features/cloudinary/media/_lib/asset-layout"
import type { DragEvent } from "react"

type PhotoMasonryMode =
  | {
      type: "admin"
      canOrganizeAssets: boolean
      draggingAssetId: string | null
      dropTarget: AssetDropTarget | null
      isBusy: boolean
      selectedAssetIds: Set<string>
      showCoverControl: boolean
    }
  | {
      type: "public"
    }

type PhotoMasonryHandlers = {
  onAssetDragEnd: () => void
  onAssetDragOver: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDragStart: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetDrop: (event: DragEvent<HTMLElement>, assetId: string) => void
  onAssetInsertionDragOver: (
    event: DragEvent<HTMLElement>,
    assetId: string,
    position: AssetDropPosition
  ) => void
  onAssetSelectionChange: (assetId: string, selected?: boolean) => void
  onColumnDragOver: (event: DragEvent<HTMLElement>, columnIndex: number) => void
  onColumnDrop: (event: DragEvent<HTMLElement>, columnIndex: number) => void
  onOpenAsset: (assetId: string) => void
  onSetShootCover: (assetId: string) => void
  onToggleHomeCarouselAsset: (assetId: string, selected: boolean) => void
}

export type { PhotoMasonryHandlers, PhotoMasonryMode }
