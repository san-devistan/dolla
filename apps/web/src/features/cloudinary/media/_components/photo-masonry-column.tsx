import { AdminPhotoCard } from "@/features/cloudinary/media/_components/admin-photo-card"
import {
  AssetInsertionDropZone,
  ColumnEndDropZone,
} from "@/features/cloudinary/media/_components/photo-drop-zones"
import { PublicPhotoButton } from "@/features/cloudinary/media/_components/public-photo-button"
import type {
  PhotoMasonryHandlers,
  PhotoMasonryMode,
} from "@/features/cloudinary/media/_types/photo-masonry-types"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryAsset } from "@/lib/cloudinary.server"
import { Fragment, type DragEvent, useMemo } from "react"

function MasonryColumn({
  assetIndexesById,
  columnAssets,
  columnIndex,
  effectiveCoverAssetId,
  handlers,
  mode,
  visualAssets,
}: {
  assetIndexesById: Map<string, number>
  columnAssets: CloudinaryAsset[]
  columnIndex: number
  effectiveCoverAssetId: string | undefined
  handlers: PhotoMasonryHandlers
  mode: PhotoMasonryMode
  visualAssets: CloudinaryAsset[]
}) {
  const handleColumnDragOver = useStableCallback(
    (event: DragEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) {
        handlers.onColumnDragOver(event, columnIndex)
      }
    }
  )
  const handleColumnDrop = useStableCallback(
    (event: DragEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) {
        handlers.onColumnDrop(event, columnIndex)
      }
    }
  )
  const columnEndState =
    mode.type === "admin"
      ? {
          isActive:
            mode.dropTarget?.type === "column-end" &&
            mode.dropTarget.columnIndex === columnIndex,
          isDragging: Boolean(mode.draggingAssetId),
        }
      : { isActive: false, isDragging: false }

  return (
    <div
      className="flex min-w-0 flex-col gap-5 self-start"
      onDragOver={handleColumnDragOver}
      onDrop={handleColumnDrop}
    >
      {columnAssets.map((asset) => (
        <MasonryAssetSlot
          key={asset.assetId}
          asset={asset}
          assetIndex={assetIndexesById.get(asset.assetId) ?? -1}
          effectiveCoverAssetId={effectiveCoverAssetId}
          handlers={handlers}
          mode={mode}
          visualAssets={visualAssets}
        />
      ))}
      {mode.type === "admin" && mode.canOrganizeAssets ? (
        <ColumnEndDropZone
          columnIndex={columnIndex}
          isActive={columnEndState.isActive}
          isDragging={columnEndState.isDragging}
          onDragOver={handlers.onColumnDragOver}
          onDrop={handlers.onColumnDrop}
        />
      ) : null}
    </div>
  )
}

function MasonryAssetSlot({
  asset,
  assetIndex,
  effectiveCoverAssetId,
  handlers,
  mode,
  visualAssets,
}: {
  asset: CloudinaryAsset
  assetIndex: number
  effectiveCoverAssetId: string | undefined
  handlers: PhotoMasonryHandlers
  mode: PhotoMasonryMode
  visualAssets: CloudinaryAsset[]
}) {
  if (mode.type === "public") {
    return (
      <PublicPhotoButton
        asset={asset}
        isPriority={assetIndex !== -1 && assetIndex < 6}
        visualAssets={visualAssets}
        onOpenAsset={handlers.onOpenAsset}
      />
    )
  }

  return (
    <AdminMasonryAssetSlot
      asset={asset}
      assetIndex={assetIndex}
      effectiveCoverAssetId={effectiveCoverAssetId}
      handlers={handlers}
      mode={mode}
    />
  )
}

function AdminMasonryAssetSlot({
  asset,
  assetIndex,
  effectiveCoverAssetId,
  handlers,
  mode,
}: {
  asset: CloudinaryAsset
  assetIndex: number
  effectiveCoverAssetId: string | undefined
  handlers: PhotoMasonryHandlers
  mode: Extract<PhotoMasonryMode, { type: "admin" }>
}) {
  const activeDropPosition =
    mode.dropTarget?.type === "asset" &&
    mode.dropTarget.assetId === asset.assetId &&
    mode.draggingAssetId !== asset.assetId
      ? mode.dropTarget.position
      : null
  const photoCardState = useMemo(
    () => ({
      isBusy: mode.isBusy,
      isCover: asset.assetId === effectiveCoverAssetId,
      isDragging: mode.draggingAssetId === asset.assetId,
      isHomeCarouselAsset:
        typeof asset.homeCarouselOrderRank === "number" &&
        asset.homeCarouselOrderRank > 0,
      isPriority: assetIndex !== -1 && assetIndex < 6,
      isSelected: mode.selectedAssetIds.has(asset.assetId),
      showCoverControl: mode.showCoverControl,
    }),
    [
      asset.assetId,
      asset.homeCarouselOrderRank,
      assetIndex,
      effectiveCoverAssetId,
      mode.draggingAssetId,
      mode.isBusy,
      mode.selectedAssetIds,
      mode.showCoverControl,
    ]
  )

  return (
    <Fragment>
      {activeDropPosition === "before" ? (
        <AssetInsertionDropZone
          assetId={asset.assetId}
          position="before"
          onDragOver={handlers.onAssetInsertionDragOver}
          onDrop={handlers.onAssetDrop}
        />
      ) : null}
      <AdminPhotoCard
        asset={asset}
        canOrganizeAssets={mode.canOrganizeAssets}
        handlers={handlers}
        state={photoCardState}
      />
      {activeDropPosition === "after" ? (
        <AssetInsertionDropZone
          assetId={asset.assetId}
          position="after"
          onDragOver={handlers.onAssetInsertionDragOver}
          onDrop={handlers.onAssetDrop}
        />
      ) : null}
    </Fragment>
  )
}

export { MasonryColumn }
