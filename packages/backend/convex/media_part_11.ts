import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  MAX_ASSETS,
  ROOT_FOLDER,
  getActiveCategoryByPath,
  getActiveShootByPath,
  listActiveAssetsForShoot,
  normalizeSiteContentKey,
} from "./media_part_01"
import {
  isDirectPhotoCategoryPath,
  listActiveCategories,
  listActiveShoots,
  rootFolderView,
} from "./media_part_02"
import { normalizeMediaName } from "./media_part_03"
import { getSiteAssetByKey } from "./media_part_04"
import {
  getDirectPhotoCategoryShoot,
  normalizeDollaPath,
} from "./media_part_05"
import { deleteShootInConvex, shootFolderView } from "./media_part_06"
import { assetView, patchOrderedAssets } from "./media_part_07"
import {
  renameCategoryInConvex,
  renameShootInConvex,
  upsertAssets,
} from "./media_part_08"
import {
  getOrderedAssetPatches,
  markMissingAssets,
  normalizeSiteAsset,
  upsertCategories,
  upsertShoots,
} from "./media_part_09"
import {
  categoryFolderView,
  deleteCategoryInConvex,
  markMissingShoots,
} from "./media_part_10"

type RenameFolderArgs = {
  folderPath: string
  name: string
}

type SetSiteAssetArgs = {
  key: string
  asset: Parameters<typeof normalizeSiteAsset>[0]
}

type ReorderAssetsArgs = {
  shootPath: string
  assetIds?: string[]
  assetLayouts?: Parameters<typeof getOrderedAssetPatches>[1]
}

type GetLibraryArgs = {
  folderPath: string
}

type SyncSnapshotArgs = {
  folders: Parameters<typeof upsertCategories>[1]
  assets: Parameters<typeof upsertAssets>[1]
  markMissingFolders: boolean
  assetFolderPaths: string[]
}

type DeleteFolderArgs = {
  folderPath: string
}

export async function renameFolderHandler(
  ctx: MutationCtx,
  args: RenameFolderArgs
) {
  const folderPath = normalizeDollaPath(args.folderPath)
  const name = normalizeMediaName(args.name)
  const category = await getActiveCategoryByPath(ctx, folderPath)

  if (category) {
    await renameCategoryInConvex(ctx, category, name)

    return null
  }

  const shoot = await getActiveShootByPath(ctx, folderPath)

  if (!shoot) {
    throw new Error("Folder not found.")
  }

  await renameShootInConvex(ctx, shoot, name)

  return null
}

export async function setSiteAssetHandler(
  ctx: MutationCtx,
  args: SetSiteAssetArgs
) {
  const key = normalizeSiteContentKey(args.key)
  const asset = normalizeSiteAsset(args.asset)
  const existing = await getSiteAssetByKey(ctx, key)

  if (existing) {
    await ctx.db.patch(existing._id, {
      ...asset,
    })
  } else {
    await ctx.db.insert("siteAssets", {
      key,
      ...asset,
    })
  }

  return null
}

export async function reorderAssetsHandler(
  ctx: MutationCtx,
  args: ReorderAssetsArgs
) {
  const shootPath = normalizeDollaPath(args.shootPath)
  const shoot = await getActiveShootByPath(ctx, shootPath)
  const resolvedShootPath =
    shoot?.path ||
    (isDirectPhotoCategoryPath(shootPath)
      ? (await getDirectPhotoCategoryShoot(ctx))?.path || shootPath
      : null)

  if (!resolvedShootPath) {
    throw new Error("Shoot not found.")
  }

  const orderedAssets = getOrderedAssetPatches(args.assetIds, args.assetLayouts)

  await patchOrderedAssets(ctx, resolvedShootPath, orderedAssets)

  return null
}

export async function getLibraryHandler(ctx: QueryCtx, args: GetLibraryArgs) {
  const categories = await listActiveCategories(ctx)
  const shoots = await listActiveShoots(ctx)
  const folders = [
    rootFolderView(),
    ...categories.map(categoryFolderView),
    ...shoots.map(shootFolderView),
  ]

  folders.sort((first, second) => {
    if (first.depth !== second.depth) {
      return first.depth - second.depth
    }

    return first.orderRank - second.orderRank
  })
  const selectedFolder =
    args.folderPath === ROOT_FOLDER
      ? categories[0]?.path || ROOT_FOLDER
      : args.folderPath
  const selectedShoot = shoots.find((shoot) => shoot.path === selectedFolder)
  const selectedDirectCategory = isDirectPhotoCategoryPath(selectedFolder)
  const selectedDirectCategoryShoot = selectedDirectCategory
    ? await getDirectPhotoCategoryShoot(ctx)
    : null
  const assets = selectedShoot
    ? await listActiveAssetsForShoot(ctx, selectedShoot.path, MAX_ASSETS)
    : selectedDirectCategory
      ? await listActiveAssetsForShoot(
          ctx,
          selectedDirectCategoryShoot?.path || selectedFolder,
          MAX_ASSETS
        )
      : []

  return {
    rootFolder: ROOT_FOLDER,
    selectedFolder,
    folders,
    assets: assets.map(assetView),
    totalFolders: folders.length,
    totalAssets: assets.length,
  }
}

export async function syncSnapshotHandler(
  ctx: MutationCtx,
  args: SyncSnapshotArgs
) {
  const shootFolders = args.folders.filter((folder) => folder.kind === "shoot")
  const categoryPathsWithShootFolders = new Set(
    shootFolders
      .map((folder) => folder.parentPath)
      .filter((path): path is string => path !== null)
  )
  const categoryFolders = args.folders.filter(
    (folder) =>
      folder.kind === "category" &&
      (categoryPathsWithShootFolders.has(folder.path) ||
        isDirectPhotoCategoryPath(folder.path))
  )
  const activeShootPaths = new Set(shootFolders.map((folder) => folder.path))

  await upsertCategories(ctx, categoryFolders)
  await upsertShoots(ctx, shootFolders)
  await upsertAssets(ctx, args.assets)

  if (args.markMissingFolders) {
    await markMissingShoots(ctx, activeShootPaths)
  }

  if (args.assetFolderPaths.length > 0) {
    await markMissingAssets(ctx, args.assetFolderPaths, args.assets)
  }

  return {
    categoryCount: categoryFolders.length,
    shootCount: shootFolders.length,
    assetCount: args.assets.length,
  }
}

export async function deleteFolderHandler(
  ctx: MutationCtx,
  args: DeleteFolderArgs
) {
  const folderPath = normalizeDollaPath(args.folderPath)
  const category = await getActiveCategoryByPath(ctx, folderPath)

  if (category) {
    await deleteCategoryInConvex(ctx, category)

    return null
  }

  const shoot = await getActiveShootByPath(ctx, folderPath)

  if (!shoot) {
    throw new Error("Folder not found.")
  }

  await deleteShootInConvex(ctx, shoot)

  return null
}
