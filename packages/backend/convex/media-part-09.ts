import type { MutationCtx } from "./_generated/server"
import {
  DIRECT_PHOTO_CATEGORY_NAME,
  MAX_ASSETS,
  ORDER_STEP,
  type OrderedAssetPatch,
  getCategoryByPath,
  getShootByPath,
} from "./media-part-01"
import {
  DIRECT_PHOTO_CATEGORY_PATH,
  getNextCategoryRank,
  getNextShootRank,
  isDirectPhotoCategoryPath,
  listActiveCategories,
  listActiveShoots,
} from "./media-part-02"
import type { ReorderAssetLayout } from "./media-part-03"
import {
  type MediaCategoryFolder,
  type SiteAssetInput,
  type SyncAsset,
  type SyncFolder,
  assertValidAssetLayout,
} from "./media-part-05"

type RankedShootFolder = SyncFolder & {
  categoryName: string
  parentPath: string
}

function isRankedShootFolder(folder: SyncFolder): folder is RankedShootFolder {
  return (
    folder.parentPath !== null &&
    folder.categoryName !== null &&
    !isDirectPhotoCategoryPath(folder.parentPath)
  )
}

async function getNextShootRanksByCategoryPath(
  ctx: MutationCtx,
  categoryPaths: string[]
) {
  const uniqueCategoryPaths = Array.from(new Set(categoryPaths))
  const nextRankByCategoryPath = new Map<string, number>()
  const entries = await Promise.all(
    uniqueCategoryPaths.map(
      async (categoryPath) =>
        [
          categoryPath,
          await getNextShootRank(ctx, nextRankByCategoryPath, categoryPath),
        ] as const
    )
  )

  return new Map(entries)
}

export async function markMissingAssets(
  ctx: MutationCtx,
  assetFolderPaths: string[],
  assets: SyncAsset[]
) {
  const activeAssetIdsByFolder = new Map<string, Set<string>>()

  for (const folderPath of assetFolderPaths) {
    activeAssetIdsByFolder.set(folderPath, new Set())
  }

  for (const asset of assets) {
    activeAssetIdsByFolder.get(asset.folder)?.add(asset.assetId)
  }

  await Promise.all(
    Array.from(activeAssetIdsByFolder, async ([folderPath, activeAssetIds]) => {
      const storedAssets = await ctx.db
        .query("mediaAssets")
        .withIndex("by_assetFolder_and_orderRank", (q) =>
          q.eq("assetFolder", folderPath)
        )
        .take(MAX_ASSETS)

      await Promise.all(
        storedAssets
          .filter((asset) => !activeAssetIds.has(asset.cloudinaryAssetId))
          .map((asset) => ctx.db.delete(asset._id))
      )
    })
  )
}

export function normalizeSiteAsset(asset: SiteAssetInput) {
  if (!asset.assetId || !asset.publicId || !asset.secureUrl) {
    throw new Error("Site asset metadata is incomplete.")
  }

  return {
    cloudinaryAssetId: asset.assetId,
    publicId: asset.publicId,
    assetFolder: asset.folder,
    displayName: asset.displayName,
    format: asset.format,
    resourceType: asset.resourceType,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    aspectRatio: asset.aspectRatio,
    secureUrl: asset.secureUrl,
    thumbnailUrl: asset.thumbnailUrl,
    previewUrl: asset.previewUrl,
    displayFolder: asset.displayFolder,
    context: asset.context,
  }
}

export async function upsertCategories(
  ctx: MutationCtx,
  folders: SyncFolder[]
) {
  const shouldBootstrapCategories =
    (await listActiveCategories(ctx)).length === 0
  let nextRank = await getNextCategoryRank(ctx)
  const existingCategories = await Promise.all(
    folders.map((folder) => getCategoryByPath(ctx, folder.path))
  )
  const writes: Array<Promise<unknown>> = []

  for (const [index, folder] of folders.entries()) {
    const existing = existingCategories[index]

    if (existing) {
      writes.push(
        ctx.db.patch(existing._id, {
          name: folder.name,
          displayPath: folder.displayPath,
        })
      )
      continue
    }

    if (!shouldBootstrapCategories) {
      continue
    }

    const orderRank = nextRank
    nextRank += ORDER_STEP

    writes.push(
      ctx.db.insert("mediaCategories", {
        path: folder.path,
        name: folder.name,
        displayPath: folder.displayPath,
        orderRank,
        coverShootPath: null,
      })
    )
  }

  await Promise.all(writes)
}

export async function upsertShoots(ctx: MutationCtx, folders: SyncFolder[]) {
  const shouldBootstrapShoots = (await listActiveShoots(ctx)).length === 0

  if (!shouldBootstrapShoots) {
    return
  }

  const rankedFolders = folders.filter(isRankedShootFolder)
  const existingShoots = await Promise.all(
    rankedFolders.map((folder) => getShootByPath(ctx, folder.path))
  )
  const insertFolders = rankedFolders.filter(
    (_folder, index) => !existingShoots[index]
  )
  const nextRanksByCategoryPath = await getNextShootRanksByCategoryPath(
    ctx,
    insertFolders.map((folder) => folder.parentPath)
  )

  await Promise.all(
    insertFolders.map((folder) => {
      const orderRank = nextRanksByCategoryPath.get(folder.parentPath)

      if (orderRank === undefined) {
        throw new Error("Could not determine the next shoot order.")
      }

      nextRanksByCategoryPath.set(folder.parentPath, orderRank + ORDER_STEP)

      return ctx.db.insert("mediaShoots", {
        path: folder.path,
        categoryPath: folder.parentPath,
        categoryName: folder.categoryName,
        name: folder.name,
        displayPath: folder.displayPath,
        orderRank,
        coverAssetId: null,
        credits: "",
      })
    })
  )
}

export function getOrderedAssetPatches(
  assetIds: string[] | undefined,
  assetLayouts: ReorderAssetLayout[] | undefined
): OrderedAssetPatch[] {
  if (assetLayouts && assetLayouts.length > 0) {
    return assetLayouts.map((assetLayout) => {
      assertValidAssetLayout(assetLayout)

      return assetLayout
    })
  }

  if (assetIds && assetIds.length > 0) {
    return assetIds.map((assetId) => ({ assetId }))
  }

  throw new Error("Photo order must include every photo in the shoot.")
}

export function getVirtualDirectPhotoCategory(
  categoryPath: string
): MediaCategoryFolder | null {
  if (!isDirectPhotoCategoryPath(categoryPath)) {
    return null
  }

  return {
    path: DIRECT_PHOTO_CATEGORY_PATH,
    name: DIRECT_PHOTO_CATEGORY_NAME,
    displayPath: DIRECT_PHOTO_CATEGORY_NAME,
    orderRank: ORDER_STEP,
    coverShootPath: null,
  }
}
