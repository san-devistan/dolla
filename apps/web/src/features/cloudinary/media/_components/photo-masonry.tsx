import { MasonryColumn } from "@/features/cloudinary/media/_components/photo-masonry-column"
import {
  buildMasonryColumns,
  flattenMasonryColumns,
} from "@/features/cloudinary/media/_lib/asset-layout"
import { getEffectiveCoverAssetId } from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import type {
  PhotoMasonryHandlers,
  PhotoMasonryMode,
} from "@/features/cloudinary/media/_types/photo-masonry-types"
import type { CloudinaryAsset, CloudinaryFolder } from "@/lib/cloudinary.server"
import { cn } from "@workspace/ui/lib/utils"
import { useMemo } from "react"

const MASONRY_COLUMN_KEYS = [
  "masonry-column-1",
  "masonry-column-2",
  "masonry-column-3",
  "masonry-column-4",
] as const

function PhotoMasonry({
  assets,
  columnCount,
  emptyMessage = "No photos in this shoot yet.",
  handlers,
  mode,
  shoot,
}: {
  assets: CloudinaryAsset[]
  columnCount: number
  emptyMessage?: string
  handlers: PhotoMasonryHandlers
  mode: PhotoMasonryMode
  shoot: CloudinaryFolder
}) {
  const layout = usePhotoMasonryLayout({ assets, columnCount, shoot })

  if (assets.length === 0) {
    return (
      <section className="mx-auto w-full max-w-[1540px] px-4 py-16 text-sm text-muted-foreground sm:px-6 lg:px-8">
        {emptyMessage}
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1540px] px-4 pb-6 sm:px-6 lg:px-8">
      <div className={getMasonryGridClass(columnCount)}>
        {layout.masonryColumns.map((columnAssets, columnIndex) => {
          return (
            <MasonryColumn
              key={MASONRY_COLUMN_KEYS[columnIndex]}
              assetIndexesById={layout.assetIndexesById}
              columnAssets={columnAssets}
              columnIndex={columnIndex}
              effectiveCoverAssetId={layout.effectiveCoverAssetId}
              handlers={handlers}
              mode={mode}
              visualAssets={layout.visualAssets}
            />
          )
        })}
      </div>
    </section>
  )
}

function usePhotoMasonryLayout({
  assets,
  columnCount,
  shoot,
}: {
  assets: CloudinaryAsset[]
  columnCount: number
  shoot: CloudinaryFolder
}) {
  const masonryColumns = useMemo(
    () => buildMasonryColumns(assets, columnCount),
    [assets, columnCount]
  )
  const visualAssets = useMemo(
    () => flattenMasonryColumns(masonryColumns),
    [masonryColumns]
  )
  const assetIndexesById = useMemo(
    () =>
      new Map(
        visualAssets.map((asset, index) => [asset.assetId, index] as const)
      ),
    [visualAssets]
  )

  return {
    assetIndexesById,
    effectiveCoverAssetId: getEffectiveCoverAssetId(shoot, assets),
    masonryColumns,
    visualAssets,
  }
}

function getMasonryGridClass(columnCount: number) {
  return cn(
    "grid gap-5",
    columnCount === 1
      ? "grid-cols-1"
      : columnCount === 2
        ? "grid-cols-2"
        : "grid-cols-4"
  )
}

export { PhotoMasonry }
export type { PhotoMasonryHandlers, PhotoMasonryMode }
