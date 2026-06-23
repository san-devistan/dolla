import type { MutationCtx } from "./_generated/server"
import {
  MAX_ASSETS,
  ORDER_STEP,
  buildShootDisplayPath,
  getActiveCategoryByPath,
  getAssetByCloudinaryAssetId,
  getCategoryByPath,
  getShootByPath,
  listActiveAssetsForCategory,
  listActiveAssetsForShoot,
} from "./media_part_01"
import {
  getNextAssetRank,
  getNextCategoryRank,
  listActiveShootsForCategory,
} from "./media_part_02"
import {
  type MediaAsset,
  type MediaCategory,
  type MediaShoot,
  normalizeMediaName,
} from "./media_part_03"
import {
  buildCategoryPath,
  getActiveShootByNameInCategory,
  normalizeDollaPath,
  type SyncAsset,
} from "./media_part_05"

type CreateCategoryArgs = {
  name: string
}

type AssetUpsertDraft = {
  asset: SyncAsset
  categoryName: string
  categoryPath: string
  displayFolder: string
  existing: MediaAsset | null
  shootName: string
}

function resolveAssetUpsertDraft(
  asset: SyncAsset,
  existing: MediaAsset | null,
  shoot: MediaShoot | null
): AssetUpsertDraft | null {
  const categoryPath = shoot?.categoryPath ?? asset.categoryPath
  const categoryName = shoot?.categoryName ?? asset.categoryName
  const shootName = shoot?.name ?? asset.shootName

  if (!categoryPath || !categoryName || !shootName) {
    return null
  }

  return {
    asset,
    categoryName,
    categoryPath,
    displayFolder: shoot?.name ?? asset.displayFolder,
    existing,
    shootName,
  }
}

function mediaAssetPatch(draft: AssetUpsertDraft) {
  return {
    publicId: draft.asset.publicId,
    assetFolder: draft.asset.folder,
    categoryPath: draft.categoryPath,
    shootPath: draft.asset.shootPath,
    categoryName: draft.categoryName,
    shootName: draft.shootName,
    displayName: draft.asset.displayName,
    format: draft.asset.format,
    resourceType: draft.asset.resourceType,
    bytes: draft.asset.bytes,
    width: draft.asset.width,
    height: draft.asset.height,
    aspectRatio: draft.asset.aspectRatio,
    secureUrl: draft.asset.secureUrl,
    thumbnailUrl: draft.asset.thumbnailUrl,
    previewUrl: draft.asset.previewUrl,
    displayFolder: draft.displayFolder,
    context: draft.asset.context,
  }
}

async function getNextAssetRanksByShootPath(
  ctx: MutationCtx,
  shootPaths: string[]
) {
  const uniqueShootPaths = Array.from(new Set(shootPaths))
  const entries = await Promise.all(
    uniqueShootPaths.map(
      async (shootPath) =>
        [shootPath, await getNextAssetRank(ctx, new Map(), shootPath)] as const
    )
  )

  return new Map(entries)
}

export async function renameShootInConvex(
  ctx: MutationCtx,
  shoot: MediaShoot,
  name: string
) {
  const category = await getActiveCategoryByPath(ctx, shoot.categoryPath)

  if (!category) {
    throw new Error("Category not found.")
  }

  const existing = await getActiveShootByNameInCategory(
    ctx,
    category.path,
    name
  )

  if (existing && existing._id !== shoot._id) {
    throw new Error("Shoot already exists in this category.")
  }

  const assets = await listActiveAssetsForShoot(ctx, shoot.path, MAX_ASSETS)

  await ctx.db.patch(shoot._id, {
    name,
    displayPath: buildShootDisplayPath(category.name, name),
  })

  await Promise.all(
    assets.map((asset) =>
      ctx.db.patch(asset._id, {
        shootName: name,
      })
    )
  )
}

export function getDollaPathDepth(path: string) {
  return Math.max(0, normalizeDollaPath(path).split("/").length - 1)
}

export function getDollaPathLeaf(path: string) {
  return normalizeDollaPath(path).split("/").at(-1) || ""
}

export function getUniqueDollaPaths(paths: string[]) {
  return Array.from(new Set(paths.map(normalizeDollaPath)))
}

export async function renameCategoryInConvex(
  ctx: MutationCtx,
  category: MediaCategory,
  name: string
) {
  const categoryPath = buildCategoryPath(name)
  const existing = await getCategoryByPath(ctx, categoryPath)

  if (existing && existing._id !== category._id) {
    throw new Error("Category already exists.")
  }

  const shoots = await listActiveShootsForCategory(ctx, category.path)
  const assets = await listActiveAssetsForCategory(
    ctx,
    category.path,
    MAX_ASSETS
  )

  await ctx.db.patch(category._id, {
    path: categoryPath,
    name,
    displayPath: name,
  })

  await Promise.all([
    ...shoots.map((shoot) =>
      ctx.db.patch(shoot._id, {
        categoryPath,
        categoryName: name,
        displayPath: buildShootDisplayPath(name, shoot.name),
      })
    ),
    ...assets.map((asset) =>
      ctx.db.patch(asset._id, {
        categoryPath,
        categoryName: name,
      })
    ),
  ])
}

export async function createCategoryHandler(
  ctx: MutationCtx,
  args: CreateCategoryArgs
) {
  const name = normalizeMediaName(args.name)
  const categoryPath = buildCategoryPath(name)
  const existing = await getCategoryByPath(ctx, categoryPath)

  if (existing) {
    throw new Error("Category already exists.")
  }

  await ctx.db.insert("mediaCategories", {
    path: categoryPath,
    name,
    displayPath: name,
    orderRank: await getNextCategoryRank(ctx),
    coverShootPath: null,
  })

  return null
}

export async function upsertAssets(ctx: MutationCtx, assets: SyncAsset[]) {
  const drafts = (
    await Promise.all(
      assets.map(async (asset) => {
        const [existing, shoot] = await Promise.all([
          getAssetByCloudinaryAssetId(ctx, asset.assetId),
          getShootByPath(ctx, asset.shootPath),
        ])

        return resolveAssetUpsertDraft(asset, existing, shoot)
      })
    )
  ).filter((draft): draft is AssetUpsertDraft => draft !== null)
  const nextRanksByShootPath = await getNextAssetRanksByShootPath(
    ctx,
    drafts
      .filter((draft) => draft.existing === null)
      .map((draft) => draft.asset.shootPath)
  )

  await Promise.all(
    drafts.map((draft) => {
      if (draft.existing) {
        return ctx.db.patch(draft.existing._id, mediaAssetPatch(draft))
      }

      const orderRank = nextRanksByShootPath.get(draft.asset.shootPath)

      if (orderRank === undefined) {
        throw new Error("Could not determine the next photo order.")
      }

      nextRanksByShootPath.set(draft.asset.shootPath, orderRank + ORDER_STEP)

      return ctx.db.insert("mediaAssets", {
        cloudinaryAssetId: draft.asset.assetId,
        ...mediaAssetPatch(draft),
        orderRank,
      })
    })
  )
}
