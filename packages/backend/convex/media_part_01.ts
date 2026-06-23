import { type GenericId, v } from "convex/values"

import type { MutationCtx, QueryCtx } from "./_generated/server"

export const ROOT_FOLDER = "Dolla"

export const DIRECT_PHOTO_CATEGORY_NAME = "Mariage"

export const STABLE_SHOOT_FOLDER_PREFIX = "s_"

export const ORDER_STEP = 1000

export const MAX_CATEGORIES = 100

export const MAX_SHOOTS = 500

export const MAX_ASSETS = 800

export const MAX_HOME_CAROUSEL_ASSETS = 24

export const MAX_CATEGORY_DESCRIPTION_LENGTH = 2000

export const MAX_SHOOT_CREDITS_LENGTH = 2000

export const MAX_SITE_CONTENT_BLOCKS = 40

export const MAX_SITE_CONTENT_TEXT_LENGTH = 12_000

export const MAX_MASONRY_COLUMNS = 4

export const FORBIDDEN_FOLDER_CHARS = /[?&#\\%<>+]/

export const nullableString = v.union(v.string(), v.null())

export const nullableNumber = v.union(v.number(), v.null())

export const folderKindValidator = v.union(
  v.literal("root"),
  v.literal("category"),
  v.literal("shoot"),
  v.literal("nested")
)

export const reorderAssetLayoutValidator = v.object({
  assetId: v.string(),
  layoutColumn: v.number(),
  layoutOrder: v.number(),
  layoutColumnCount: v.number(),
})

export const movedShootValidator = v.object({
  fromPath: v.string(),
  toPath: v.string(),
})

export const siteContentBlockValidator = v.object({
  id: v.string(),
  kind: v.union(v.literal("paragraph"), v.literal("heading")),
  text: v.string(),
  bold: v.boolean(),
})

export type OrderedAssetPatch = {
  assetId: string
  layoutColumn?: number
  layoutOrder?: number
  layoutColumnCount?: number
}

export type SystemFields<TableName extends string> = {
  _id: GenericId<TableName>
  _creationTime: number
}

export async function getCategoryByPath(ctx: MutationCtx, path: string) {
  return await ctx.db
    .query("mediaCategories")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique()
}

export async function getShootByPath(ctx: MutationCtx, path: string) {
  return await ctx.db
    .query("mediaShoots")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique()
}

export async function getAssetByCloudinaryAssetId(
  ctx: MutationCtx,
  assetId: string
) {
  return await ctx.db
    .query("mediaAssets")
    .withIndex("by_cloudinaryAssetId", (q) =>
      q.eq("cloudinaryAssetId", assetId)
    )
    .unique()
}

export async function listActiveAssetsForShoot(
  ctx: QueryCtx | MutationCtx,
  shootPath: string,
  limit: number
) {
  return await ctx.db
    .query("mediaAssets")
    .withIndex("by_shootPath_and_orderRank", (q) =>
      q.eq("shootPath", shootPath)
    )
    .order("asc")
    .take(limit)
}

export function buildShootDisplayPath(categoryName: string, shootName: string) {
  return `${categoryName} / ${shootName}`
}

export function namesMatch(first: string, second: string) {
  return first.localeCompare(second, undefined, { sensitivity: "base" }) === 0
}

export async function listActiveAssetsForCategory(
  ctx: QueryCtx | MutationCtx,
  categoryPath: string,
  limit: number
) {
  return await ctx.db
    .query("mediaAssets")
    .withIndex("by_categoryPath_and_orderRank", (q) =>
      q.eq("categoryPath", categoryPath)
    )
    .order("asc")
    .take(limit)
}

export async function getActiveCategoryByPath(
  ctx: QueryCtx | MutationCtx,
  path: string
) {
  const category = await ctx.db
    .query("mediaCategories")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique()

  return category
}

export async function getActiveShootByPath(
  ctx: QueryCtx | MutationCtx,
  path: string
) {
  const shoot = await ctx.db
    .query("mediaShoots")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique()

  return shoot
}

export async function getActiveAssetByCloudinaryAssetId(
  ctx: QueryCtx | MutationCtx,
  assetId: string
) {
  const asset = await ctx.db
    .query("mediaAssets")
    .withIndex("by_cloudinaryAssetId", (q) =>
      q.eq("cloudinaryAssetId", assetId)
    )
    .unique()

  return asset
}

export function normalizeSiteContentKey(key: string) {
  const normalizedKey = key.trim()

  if (!normalizedKey) {
    throw new Error("Content key is required.")
  }

  return normalizedKey
}
