import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  DIRECT_PHOTO_CATEGORY_NAME,
  MAX_ASSETS,
  ORDER_STEP,
  ROOT_FOLDER,
  STABLE_SHOOT_FOLDER_PREFIX,
  getActiveCategoryByPath,
  listActiveAssetsForShoot,
} from "./media_part_01"
import {
  DIRECT_PHOTO_CATEGORY_PATH,
  isDirectPhotoCategoryPath,
  listActiveShoots,
  listActiveShootsForCategory,
} from "./media_part_02"
import type { MediaCategory, MediaShoot } from "./media_part_03"
import type { MediaCategoryFolder } from "./media_part_05"
import {
  deleteShootInConvex,
  getShootCoverAsset,
  moveShootsInConvex,
} from "./media_part_06"
import {
  assetView,
  getActiveSiteAssetByKey,
  siteAssetView,
} from "./media_part_07"
import {
  getDollaPathDepth,
  getDollaPathLeaf,
  getUniqueDollaPaths,
} from "./media_part_08"

type GetSiteAssetArgs = {
  key: string
}

type MoveShootsArgs = {
  shootPaths: string[]
  targetCategoryPath: string
}

export function categoryFolderView(category: MediaCategoryFolder) {
  return {
    name: category.name,
    path: category.path,
    displayPath: category.displayPath,
    kind: "category" as const,
    depth: 1,
    parentPath: ROOT_FOLDER,
    categoryName: category.name,
    shootName: null,
    orderRank: category.orderRank,
    coverShootPath: category.coverShootPath,
    coverAssetId: null,
    description: category.description ?? null,
    credits: null,
  }
}

export async function markMissingShoots(
  ctx: MutationCtx,
  activeShootPaths: Set<string>
) {
  const shoots = await listActiveShoots(ctx)
  const missingShoots = shoots.filter(
    (shoot) =>
      !activeShootPaths.has(shoot.path) &&
      !isDirectPhotoCategoryPath(shoot.categoryPath)
  )

  await Promise.all(
    missingShoots.map((shoot) => deleteShootInConvex(ctx, shoot))
  )
}

export async function deleteCategoryInConvex(
  ctx: MutationCtx,
  category: MediaCategory
) {
  if (isDirectPhotoCategoryPath(category.path)) {
    throw new Error("Mariage cannot be deleted.")
  }

  const shoots = await listActiveShootsForCategory(ctx, category.path)

  await Promise.all(shoots.map((shoot) => deleteShootInConvex(ctx, shoot)))

  await ctx.db.delete(category._id)
}

function selectCategoryShoot(
  category: MediaCategory,
  categoryShoots: MediaShoot[]
) {
  if (isDirectPhotoCategoryPath(category.path)) {
    return categoryShoots[0] || null
  }

  return (
    categoryShoots.find((shoot) => shoot.path === category.coverShootPath) ||
    categoryShoots[0] ||
    null
  )
}

async function buildStoredCategorySummary(
  ctx: QueryCtx,
  category: MediaCategory,
  shoots: MediaShoot[]
) {
  const isDirectCategory = isDirectPhotoCategoryPath(category.path)
  const categoryShoots = shoots.filter(
    (shoot) => shoot.categoryPath === category.path
  )
  const selectedShoot = selectCategoryShoot(category, categoryShoots)
  const directCategoryAssets = isDirectCategory
    ? await listActiveAssetsForShoot(
        ctx,
        selectedShoot?.path || category.path,
        MAX_ASSETS
      )
    : []
  const coverAsset = isDirectCategory
    ? directCategoryAssets[0] || null
    : selectedShoot
      ? await getShootCoverAsset(ctx, selectedShoot)
      : null

  return {
    name: category.name,
    path: category.path,
    orderRank: category.orderRank,
    cover: coverAsset ? assetView(coverAsset) : null,
    shootCount: isDirectCategory ? 0 : categoryShoots.length,
    assetCount: directCategoryAssets.length,
    isDirectPhotoCategory: isDirectCategory,
  }
}

async function buildVirtualDirectCategorySummary(
  ctx: QueryCtx,
  orderRank: number
) {
  const assets = await listActiveAssetsForShoot(
    ctx,
    DIRECT_PHOTO_CATEGORY_PATH,
    MAX_ASSETS
  )

  return {
    name: DIRECT_PHOTO_CATEGORY_NAME,
    path: DIRECT_PHOTO_CATEGORY_PATH,
    orderRank,
    cover: assets[0] ? assetView(assets[0]) : null,
    shootCount: 0,
    assetCount: assets.length,
    isDirectPhotoCategory: true,
  }
}

export async function buildCategorySummaries(
  ctx: QueryCtx,
  categories: MediaCategory[]
) {
  const shoots = await listActiveShoots(ctx)
  const summaries = await Promise.all(
    categories.map((category) =>
      buildStoredCategorySummary(ctx, category, shoots)
    )
  )

  if (
    !categories.some((category) => isDirectPhotoCategoryPath(category.path))
  ) {
    const directCategorySummary = await buildVirtualDirectCategorySummary(
      ctx,
      (summaries.at(-1)?.orderRank || 0) + ORDER_STEP
    )

    summaries.push(directCategorySummary)
  }

  return summaries
}

export async function shootSummaryView(ctx: QueryCtx, shoot: MediaShoot) {
  const [coverAsset, assets] = await Promise.all([
    getShootCoverAsset(ctx, shoot),
    listActiveAssetsForShoot(ctx, shoot.path, MAX_ASSETS),
  ])

  return {
    name: shoot.name,
    path: shoot.path,
    categoryName: shoot.categoryName,
    cover: coverAsset ? assetView(coverAsset) : null,
    assetCount: assets.length,
  }
}

export async function getSiteAssetHandler(
  ctx: QueryCtx,
  args: GetSiteAssetArgs
) {
  const asset = await getActiveSiteAssetByKey(ctx, args.key)

  return asset ? siteAssetView(asset) : null
}

export function isStableShootPath(path: string) {
  return (
    getDollaPathDepth(path) === 1 &&
    getDollaPathLeaf(path).startsWith(STABLE_SHOOT_FOLDER_PREFIX)
  )
}

export async function moveShootsHandler(
  ctx: MutationCtx,
  args: MoveShootsArgs
) {
  const targetCategory = await getActiveCategoryByPath(
    ctx,
    args.targetCategoryPath
  )

  if (!targetCategory) {
    throw new Error("Target category not found.")
  }

  if (isDirectPhotoCategoryPath(targetCategory.path)) {
    throw new Error(
      "Mariage displays its single shoot directly and cannot accept moved shoots."
    )
  }

  const uniqueShootPaths = getUniqueDollaPaths(args.shootPaths)

  if (uniqueShootPaths.length === 0) {
    throw new Error("Select at least one shoot to move.")
  }

  await moveShootsInConvex(ctx, uniqueShootPaths, targetCategory)

  return null
}
