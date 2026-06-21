import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  MAX_ASSETS,
  ORDER_STEP,
  type OrderedAssetPatch,
  getActiveCategoryByPath,
  listActiveAssetsForShoot,
  normalizeSiteContentKey,
} from "./media-part-01"
import {
  type MediaAsset,
  type SiteAsset,
  normalizeSiteContentBlocks,
} from "./media-part-03"
import {
  getSiteAssetByKey,
  getSiteContentByKey,
  patchOrderedCategories,
} from "./media-part-04"
import { patchOrderedShoots } from "./media-part-05"

type GetSiteContentArgs = {
  key: string
}

type SetSiteContentArgs = {
  key: string
  blocks: Parameters<typeof normalizeSiteContentBlocks>[0]
}

type ReorderCategoriesArgs = {
  categoryPaths: string[]
}

type ReorderShootsArgs = {
  categoryPath: string
  shootPaths: string[]
}

export async function patchOrderedAssets(
  ctx: MutationCtx,
  shootPath: string,
  orderedAssets: OrderedAssetPatch[]
) {
  const assets = await listActiveAssetsForShoot(ctx, shootPath, MAX_ASSETS)
  const assetsById = new Map(
    assets.map((asset) => [asset.cloudinaryAssetId, asset])
  )
  const seenAssetIds = new Set<string>()

  if (orderedAssets.length !== assets.length) {
    throw new Error("Photo order must include every photo in the shoot.")
  }

  const patches = orderedAssets.flatMap((orderedAsset, index) => {
    if (seenAssetIds.has(orderedAsset.assetId)) {
      throw new Error("Photo order cannot include the same photo twice.")
    }

    seenAssetIds.add(orderedAsset.assetId)

    const asset = assetsById.get(orderedAsset.assetId)

    if (!asset) {
      throw new Error("Photo order can only include photos in the shoot.")
    }

    const orderRank = (index + 1) * ORDER_STEP
    const patch: Partial<
      Pick<
        MediaAsset,
        "orderRank" | "layoutColumn" | "layoutOrder" | "layoutColumnCount"
      >
    > = {}

    if (asset.orderRank !== orderRank) {
      patch.orderRank = orderRank
    }

    if (orderedAsset.layoutColumn !== undefined) {
      patch.layoutColumn = orderedAsset.layoutColumn
      patch.layoutOrder = orderedAsset.layoutOrder
      patch.layoutColumnCount = orderedAsset.layoutColumnCount
    }

    if (Object.keys(patch).length > 0) {
      return [{ asset, patch }]
    }

    return []
  })

  await Promise.all(
    patches.map(({ asset, patch }) => ctx.db.patch(asset._id, patch))
  )
}

export function assetView(asset: MediaAsset) {
  return {
    assetId: asset.cloudinaryAssetId,
    publicId: asset.publicId,
    folder: asset.assetFolder,
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
    categoryName: asset.categoryName,
    shootName: asset.shootName,
    context: asset.context,
    orderRank: asset.orderRank,
    layoutColumn: asset.layoutColumn ?? null,
    layoutOrder: asset.layoutOrder ?? null,
    layoutColumnCount: asset.layoutColumnCount ?? null,
    homeCarouselOrderRank: asset.homeCarouselOrderRank ?? null,
  }
}

export function siteAssetView(asset: SiteAsset) {
  return {
    key: asset.key,
    assetId: asset.cloudinaryAssetId,
    publicId: asset.publicId,
    folder: asset.assetFolder,
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

export async function getSiteContentHandler(
  ctx: QueryCtx,
  args: GetSiteContentArgs
) {
  const content = await getSiteContentByKey(ctx, args.key)

  if (!content) {
    return null
  }

  return {
    key: content.key,
    blocks: content.blocks,
  }
}

export async function setSiteContentHandler(
  ctx: MutationCtx,
  args: SetSiteContentArgs
) {
  const blocks = normalizeSiteContentBlocks(args.blocks)
  const content = await getSiteContentByKey(ctx, args.key)

  if (content) {
    await ctx.db.patch(content._id, { blocks })
  } else {
    await ctx.db.insert("siteContent", {
      key: normalizeSiteContentKey(args.key),
      blocks,
    })
  }

  return null
}

export async function getActiveSiteAssetByKey(
  ctx: QueryCtx | MutationCtx,
  key: string
) {
  const asset = await getSiteAssetByKey(ctx, key)

  return asset
}

export async function reorderCategoriesHandler(
  ctx: MutationCtx,
  args: ReorderCategoriesArgs
) {
  await patchOrderedCategories(ctx, args.categoryPaths)

  return null
}

export async function reorderShootsHandler(
  ctx: MutationCtx,
  args: ReorderShootsArgs
) {
  const category = await getActiveCategoryByPath(ctx, args.categoryPath)

  if (!category) {
    throw new Error("Category not found.")
  }

  await patchOrderedShoots(ctx, category.path, args.shootPaths)

  return null
}
