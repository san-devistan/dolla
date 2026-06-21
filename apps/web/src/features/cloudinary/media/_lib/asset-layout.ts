import type { CloudinaryAsset } from "@/lib/cloudinary.server"
import { type DragEvent, useSyncExternalStore } from "react"

export type AssetDropPosition = "before" | "after"
export type AssetDropTarget =
  | {
      assetId: string
      position: AssetDropPosition
      type: "asset"
    }
  | {
      columnIndex: number
      type: "column-end"
    }

type AssetDropMove = {
  assets: CloudinaryAsset[]
  columnCount: number
  draggedAssetId: string
  dropPosition: AssetDropPosition
  targetAssetId: string
}

const DEFAULT_MASONRY_COLUMN_COUNT = 1
const TABLET_MASONRY_MEDIA_QUERY = "(min-width: 640px)"
const DESKTOP_MASONRY_MEDIA_QUERY = "(min-width: 1024px)"

export function useMasonryColumnCount() {
  return useSyncExternalStore(
    subscribeToMasonryMediaQueries,
    getMasonryColumnCountSnapshot,
    getServerMasonryColumnCountSnapshot
  )
}

function subscribeToMasonryMediaQueries(onStoreChange: () => void) {
  const tabletMediaQuery = window.matchMedia(TABLET_MASONRY_MEDIA_QUERY)
  const desktopMediaQuery = window.matchMedia(DESKTOP_MASONRY_MEDIA_QUERY)

  tabletMediaQuery.addEventListener("change", onStoreChange)
  desktopMediaQuery.addEventListener("change", onStoreChange)

  return () => {
    tabletMediaQuery.removeEventListener("change", onStoreChange)
    desktopMediaQuery.removeEventListener("change", onStoreChange)
  }
}

function getMasonryColumnCountSnapshot() {
  if (window.matchMedia(DESKTOP_MASONRY_MEDIA_QUERY).matches) {
    return 4
  }

  return window.matchMedia(TABLET_MASONRY_MEDIA_QUERY).matches ? 2 : 1
}

function getServerMasonryColumnCountSnapshot() {
  return DEFAULT_MASONRY_COLUMN_COUNT
}

export function getAssetDropPosition(
  event: DragEvent<HTMLElement>
): AssetDropPosition {
  const bounds = event.currentTarget.getBoundingClientRect()
  const midpoint = bounds.top + bounds.height / 2

  return event.clientY < midpoint ? "before" : "after"
}

export function moveAssetToDropTarget({
  assets,
  columnCount,
  draggedAssetId,
  dropPosition,
  targetAssetId,
}: AssetDropMove) {
  const columns = buildMasonryColumns(assets, columnCount)
  const draggedAsset = removeAssetFromMasonryColumns(columns, draggedAssetId)

  if (!draggedAsset) {
    return null
  }

  const targetColumn = columns.find((column) =>
    column.some((asset) => asset.assetId === targetAssetId)
  )

  if (!targetColumn) {
    return null
  }

  const targetIndex = targetColumn.findIndex(
    (asset) => asset.assetId === targetAssetId
  )

  if (targetIndex === -1) {
    return null
  }

  const insertIndex = dropPosition === "after" ? targetIndex + 1 : targetIndex
  targetColumn.splice(insertIndex, 0, draggedAsset)

  return getChangedFlattenedMasonryAssets(assets, columns, columnCount)
}

export function moveAssetToColumnEnd(
  assets: CloudinaryAsset[],
  draggedAssetId: string,
  columnIndex: number,
  columnCount: number
) {
  const columns = buildMasonryColumns(assets, columnCount)
  const draggedAsset = removeAssetFromMasonryColumns(columns, draggedAssetId)
  const targetColumn = columns[columnIndex]

  if (!draggedAsset || !targetColumn) {
    return null
  }

  targetColumn.push(draggedAsset)

  return getChangedFlattenedMasonryAssets(assets, columns, columnCount)
}

export function buildMasonryColumns(
  assets: CloudinaryAsset[],
  columnCount: number
) {
  const resolvedColumnCount = getMasonryColumnCount(columnCount)
  const savedColumns = getSavedMasonryColumns(assets, resolvedColumnCount)

  if (savedColumns) {
    return savedColumns
  }

  return buildDefaultMasonryColumns(assets, resolvedColumnCount)
}

function getSavedMasonryColumns(
  assets: CloudinaryAsset[],
  columnCount: number
) {
  const columns = createEmptyMasonryColumns(columnCount)
  const assetIndexesById = new Map(
    assets.map((asset, index) => [asset.assetId, index] as const)
  )

  for (const asset of assets) {
    if (!hasMasonryLayout(asset, columnCount)) {
      return null
    }

    const column = columns[asset.layoutColumn]

    if (!column) {
      return null
    }

    column.push(asset)
  }

  columns.forEach((column) => {
    column.sort((first, second) => {
      const layoutDifference =
        (first.layoutOrder ?? 0) - (second.layoutOrder ?? 0)

      if (layoutDifference !== 0) {
        return layoutDifference
      }

      return (
        (assetIndexesById.get(first.assetId) ?? 0) -
        (assetIndexesById.get(second.assetId) ?? 0)
      )
    })
  })

  return columns
}

function buildDefaultMasonryColumns(
  assets: CloudinaryAsset[],
  columnCount: number
) {
  const columns = createEmptyMasonryColumns(columnCount)

  assets.forEach((asset, index) => {
    const column = columns[index % columnCount]

    if (column) {
      column.push(asset)
    }
  })

  return columns
}

function createEmptyMasonryColumns(columnCount: number) {
  return Array.from({ length: columnCount }, () => [] as CloudinaryAsset[])
}

function hasMasonryLayout(
  asset: CloudinaryAsset,
  columnCount: number
): asset is CloudinaryAsset & {
  layoutColumn: number
  layoutOrder: number
  layoutColumnCount: number
} {
  const { layoutColumn, layoutColumnCount, layoutOrder } = asset

  return (
    layoutColumnCount === columnCount &&
    typeof layoutColumn === "number" &&
    Number.isInteger(layoutColumn) &&
    layoutColumn >= 0 &&
    layoutColumn < columnCount &&
    typeof layoutOrder === "number" &&
    Number.isInteger(layoutOrder) &&
    layoutOrder >= 0
  )
}

export function getAssetLayoutOrder(
  assets: CloudinaryAsset[],
  columnCount: number
) {
  const resolvedColumnCount = getMasonryColumnCount(columnCount)

  return assets.map((asset, index) => {
    if (hasMasonryLayout(asset, resolvedColumnCount)) {
      return {
        assetId: asset.assetId,
        layoutColumn: asset.layoutColumn,
        layoutOrder: asset.layoutOrder,
        layoutColumnCount: resolvedColumnCount,
      }
    }

    return {
      assetId: asset.assetId,
      layoutColumn: index % resolvedColumnCount,
      layoutOrder: Math.floor(index / resolvedColumnCount),
      layoutColumnCount: resolvedColumnCount,
    }
  })
}

export function flattenMasonryColumns(columns: CloudinaryAsset[][]) {
  const rowCount = Math.max(0, ...columns.map((column) => column.length))
  const assets: CloudinaryAsset[] = []

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    columns.forEach((column) => {
      const asset = column[rowIndex]

      if (asset) {
        assets.push(asset)
      }
    })
  }

  return assets
}

function removeAssetFromMasonryColumns(
  columns: CloudinaryAsset[][],
  assetId: string
) {
  for (const column of columns) {
    for (let assetIndex = 0; assetIndex < column.length; assetIndex += 1) {
      if (column[assetIndex]?.assetId !== assetId) {
        continue
      }

      const [asset] = column.splice(assetIndex, 1)

      return asset || null
    }
  }

  return null
}

function getChangedFlattenedMasonryAssets(
  previousAssets: CloudinaryAsset[],
  columns: CloudinaryAsset[][],
  columnCount: number
) {
  const resolvedColumnCount = getMasonryColumnCount(columnCount)
  const nextAssets = flattenMasonryColumns(
    columns.map((column, columnIndex) =>
      column.map((asset, layoutOrder) => ({
        ...asset,
        layoutColumn: columnIndex,
        layoutOrder,
        layoutColumnCount: resolvedColumnCount,
      }))
    )
  )
  const previousAssetsById = new Map(
    previousAssets.map((asset) => [asset.assetId, asset] as const)
  )
  const didChange = nextAssets.some((asset, index) => {
    const previousAsset = previousAssetsById.get(asset.assetId)

    return (
      asset.assetId !== previousAssets[index]?.assetId ||
      asset.layoutColumn !== previousAsset?.layoutColumn ||
      asset.layoutOrder !== previousAsset?.layoutOrder ||
      asset.layoutColumnCount !== previousAsset?.layoutColumnCount
    )
  })

  return didChange ? nextAssets : null
}

function getMasonryColumnCount(columnCount: number) {
  if (columnCount >= 4) {
    return 4
  }

  if (columnCount >= 2) {
    return 2
  }

  return 1
}
