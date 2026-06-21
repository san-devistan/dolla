import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  DIRECT_PHOTO_CATEGORY_NAME,
  MAX_CATEGORIES,
  MAX_CATEGORY_DESCRIPTION_LENGTH,
  MAX_HOME_CAROUSEL_ASSETS,
  MAX_SHOOTS,
  MAX_SHOOT_CREDITS_LENGTH,
  ORDER_STEP,
  ROOT_FOLDER,
} from "./media-part-01"

export function rootFolderView() {
  return {
    name: ROOT_FOLDER,
    path: ROOT_FOLDER,
    displayPath: "Project",
    kind: "root" as const,
    depth: 0,
    parentPath: null,
    categoryName: null,
    shootName: null,
    orderRank: 0,
    coverShootPath: null,
    coverAssetId: null,
    description: null,
    credits: null,
  }
}

export const DIRECT_PHOTO_CATEGORY_PATH = `${ROOT_FOLDER}/${DIRECT_PHOTO_CATEGORY_NAME}`

export function isDirectPhotoCategoryPath(path: string) {
  const segments = path.split("/")

  return (
    segments.length === 2 &&
    segments[0] === ROOT_FOLDER &&
    segments[1]?.toLowerCase() === DIRECT_PHOTO_CATEGORY_NAME.toLowerCase()
  )
}

export async function getNextCategoryRank(ctx: MutationCtx) {
  const categories = await ctx.db
    .query("mediaCategories")
    .withIndex("by_orderRank")
    .order("desc")
    .take(1)

  return (categories[0]?.orderRank || 0) + ORDER_STEP
}

export async function getNextShootRank(
  ctx: MutationCtx,
  nextRankByCategoryPath: Map<string, number>,
  categoryPath: string
) {
  const cachedRank = nextRankByCategoryPath.get(categoryPath)

  if (cachedRank) {
    nextRankByCategoryPath.set(categoryPath, cachedRank + ORDER_STEP)
    return cachedRank
  }

  const shoots = await ctx.db
    .query("mediaShoots")
    .withIndex("by_categoryPath_and_orderRank", (q) =>
      q.eq("categoryPath", categoryPath)
    )
    .order("desc")
    .take(1)
  const nextRank = (shoots[0]?.orderRank || 0) + ORDER_STEP

  nextRankByCategoryPath.set(categoryPath, nextRank + ORDER_STEP)

  return nextRank
}

export async function getNextAssetRank(
  ctx: MutationCtx,
  nextRankByShootPath: Map<string, number>,
  shootPath: string
) {
  const cachedRank = nextRankByShootPath.get(shootPath)

  if (cachedRank) {
    nextRankByShootPath.set(shootPath, cachedRank + ORDER_STEP)
    return cachedRank
  }

  const assets = await ctx.db
    .query("mediaAssets")
    .withIndex("by_shootPath_and_orderRank", (q) =>
      q.eq("shootPath", shootPath)
    )
    .order("desc")
    .take(1)
  const nextRank = (assets[0]?.orderRank || 0) + ORDER_STEP

  nextRankByShootPath.set(shootPath, nextRank + ORDER_STEP)

  return nextRank
}

export async function getNextHomeCarouselAssetRank(ctx: MutationCtx) {
  const assets = await ctx.db
    .query("mediaAssets")
    .withIndex("by_homeCarouselOrderRank", (q) =>
      q.gt("homeCarouselOrderRank", 0)
    )
    .order("desc")
    .take(1)

  return (assets[0]?.homeCarouselOrderRank || 0) + ORDER_STEP
}

export async function listActiveCategories(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("mediaCategories")
    .withIndex("by_orderRank")
    .order("asc")
    .take(MAX_CATEGORIES)
}

export async function listActiveShoots(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("mediaShoots")
    .withIndex("by_orderRank")
    .order("asc")
    .take(MAX_SHOOTS)
}

export async function listActiveShootsForCategory(
  ctx: QueryCtx | MutationCtx,
  categoryPath: string
) {
  return await ctx.db
    .query("mediaShoots")
    .withIndex("by_categoryPath_and_orderRank", (q) =>
      q.eq("categoryPath", categoryPath)
    )
    .order("asc")
    .take(MAX_SHOOTS)
}

export async function listActiveHomeCarouselAssets(
  ctx: QueryCtx | MutationCtx
) {
  return await ctx.db
    .query("mediaAssets")
    .withIndex("by_homeCarouselOrderRank", (q) =>
      q.gt("homeCarouselOrderRank", 0)
    )
    .order("asc")
    .take(MAX_HOME_CAROUSEL_ASSETS)
}

export function normalizeCategoryDescription(description: string) {
  const normalizedDescription = description.trim().replace(/\s+/g, " ")

  if (normalizedDescription.length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description must be ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters or less.`
    )
  }

  return normalizedDescription
}

export function normalizeShootCredits(credits: string) {
  const normalizedCredits = credits.trim()

  if (normalizedCredits.length > MAX_SHOOT_CREDITS_LENGTH) {
    throw new Error(
      `Credits must be ${MAX_SHOOT_CREDITS_LENGTH} characters or less.`
    )
  }

  return normalizedCredits
}
