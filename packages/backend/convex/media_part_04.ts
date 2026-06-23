import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  ORDER_STEP,
  getActiveAssetByCloudinaryAssetId,
  getActiveCategoryByPath,
  getActiveShootByPath,
  getCategoryByPath,
  getShootByPath,
  normalizeSiteContentKey,
} from "./media_part_01"
import {
  getNextHomeCarouselAssetRank,
  isDirectPhotoCategoryPath,
  listActiveCategories,
} from "./media_part_02"

type PreserveMovedShootMetadataArgs = {
  moves: Array<{
    fromPath: string
    toPath: string
  }>
}

type SetCategoryCoverShootArgs = {
  categoryPath: string
  shootPath: string | null
}

type SetShootCoverArgs = {
  shootPath: string
  assetId: string | null
}

type SetHomeCarouselAssetArgs = {
  assetId: string
  selected: boolean
}

export async function preserveMovedShootMetadataHandler(
  ctx: MutationCtx,
  args: PreserveMovedShootMetadataArgs
) {
  await Promise.all(
    args.moves.map(async (move) => {
      const [sourceShoot, targetShoot] = await Promise.all([
        getShootByPath(ctx, move.fromPath),
        getShootByPath(ctx, move.toPath),
      ])

      if (!sourceShoot || !targetShoot) {
        return
      }

      const sourceCategory = await getCategoryByPath(
        ctx,
        sourceShoot.categoryPath
      )
      const writes = [
        ctx.db.patch(targetShoot._id, {
          coverAssetId: sourceShoot.coverAssetId,
          credits: sourceShoot.credits ?? "",
        }),
      ]

      if (sourceCategory?.coverShootPath === sourceShoot.path) {
        writes.push(ctx.db.patch(sourceCategory._id, { coverShootPath: null }))
      }

      await Promise.all(writes)
    })
  )

  return null
}

export async function setCategoryCoverShootHandler(
  ctx: MutationCtx,
  args: SetCategoryCoverShootArgs
) {
  const category = await getActiveCategoryByPath(ctx, args.categoryPath)

  if (!category) {
    throw new Error("Category not found.")
  }

  if (args.shootPath) {
    const shoot = await getActiveShootByPath(ctx, args.shootPath)

    if (!shoot || shoot.categoryPath !== category.path) {
      throw new Error("Cover shoot must belong to the selected category.")
    }
  }

  await ctx.db.patch(category._id, { coverShootPath: args.shootPath })

  return null
}

export async function setShootCoverHandler(
  ctx: MutationCtx,
  args: SetShootCoverArgs
) {
  const shoot = await getActiveShootByPath(ctx, args.shootPath)

  if (!shoot) {
    throw new Error("Shoot not found.")
  }

  if (args.assetId) {
    const asset = await getActiveAssetByCloudinaryAssetId(ctx, args.assetId)

    if (!asset || asset.shootPath !== shoot.path) {
      throw new Error("Cover photo must belong to the selected shoot.")
    }
  }

  await ctx.db.patch(shoot._id, { coverAssetId: args.assetId })

  return null
}

export async function getSiteContentByKey(
  ctx: QueryCtx | MutationCtx,
  key: string
) {
  return await ctx.db
    .query("siteContent")
    .withIndex("by_key", (q) => q.eq("key", normalizeSiteContentKey(key)))
    .unique()
}

export async function getSiteAssetByKey(
  ctx: QueryCtx | MutationCtx,
  key: string
) {
  return await ctx.db
    .query("siteAssets")
    .withIndex("by_key", (q) => q.eq("key", normalizeSiteContentKey(key)))
    .unique()
}

export async function setHomeCarouselAssetHandler(
  ctx: MutationCtx,
  args: SetHomeCarouselAssetArgs
) {
  const asset = await getActiveAssetByCloudinaryAssetId(ctx, args.assetId)

  if (!asset) {
    throw new Error("Photo not found.")
  }

  if (!args.selected) {
    await ctx.db.patch(asset._id, { homeCarouselOrderRank: 0 })

    return null
  }

  if (asset.homeCarouselOrderRank && asset.homeCarouselOrderRank > 0) {
    return null
  }

  await ctx.db.patch(asset._id, {
    homeCarouselOrderRank: await getNextHomeCarouselAssetRank(ctx),
  })

  return null
}

export async function patchOrderedCategories(
  ctx: MutationCtx,
  categoryPaths: string[]
) {
  const categories = await listActiveCategories(ctx)
  const categoriesByPath = new Map(
    categories.map((category) => [category.path, category])
  )
  const orderedKnownCategoryPaths = categoryPaths.filter((categoryPath) =>
    categoriesByPath.has(categoryPath)
  )
  const unknownCategoryPaths = categoryPaths.filter(
    (categoryPath) =>
      !categoriesByPath.has(categoryPath) &&
      !isDirectPhotoCategoryPath(categoryPath)
  )
  const seenCategoryPaths = new Set<string>()

  if (unknownCategoryPaths.length > 0) {
    throw new Error("Category order can only include active categories.")
  }

  if (orderedKnownCategoryPaths.length !== categories.length) {
    throw new Error("Category order must include every category.")
  }

  const patches = orderedKnownCategoryPaths.flatMap((categoryPath, index) => {
    if (seenCategoryPaths.has(categoryPath)) {
      throw new Error("Category order cannot include the same category twice.")
    }

    seenCategoryPaths.add(categoryPath)

    const category = categoriesByPath.get(categoryPath)

    if (!category) {
      throw new Error("Category order can only include active categories.")
    }

    const orderRank = (index + 1) * ORDER_STEP

    if (category.orderRank !== orderRank) {
      return [{ category, orderRank }]
    }

    return []
  })

  await Promise.all(
    patches.map(({ category, orderRank }) =>
      ctx.db.patch(category._id, { orderRank })
    )
  )
}
