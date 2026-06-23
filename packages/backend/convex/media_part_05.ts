import type { Infer } from "convex/values"

import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  MAX_MASONRY_COLUMNS,
  ORDER_STEP,
  ROOT_FOLDER,
  getActiveCategoryByPath,
  getActiveShootByPath,
  namesMatch,
} from "./media_part_01"
import {
  DIRECT_PHOTO_CATEGORY_PATH,
  listActiveShootsForCategory,
  normalizeCategoryDescription,
  normalizeShootCredits,
} from "./media_part_02"
import {
  type MediaCategory,
  type ReorderAssetLayout,
  normalizeMediaName,
  type siteAssetValidator,
  type syncAssetValidator,
  type syncFolderValidator,
} from "./media_part_03"

type SetCategoryDescriptionArgs = {
  categoryPath: string
  description: string
}

type SetShootCreditsArgs = {
  shootPath: string
  credits: string
}

export async function patchOrderedShoots(
  ctx: MutationCtx,
  categoryPath: string,
  shootPaths: string[]
) {
  const shoots = await listActiveShootsForCategory(ctx, categoryPath)
  const shootsByPath = new Map(shoots.map((shoot) => [shoot.path, shoot]))
  const seenShootPaths = new Set<string>()

  if (shootPaths.length !== shoots.length) {
    throw new Error("Shoot order must include every shoot in the category.")
  }

  const patches = shootPaths.flatMap((shootPath, index) => {
    if (seenShootPaths.has(shootPath)) {
      throw new Error("Shoot order cannot include the same shoot twice.")
    }

    seenShootPaths.add(shootPath)

    const shoot = shootsByPath.get(shootPath)

    if (!shoot) {
      throw new Error("Shoot order can only include shoots in the category.")
    }

    const orderRank = (index + 1) * ORDER_STEP

    if (shoot.orderRank !== orderRank) {
      return [{ shoot, orderRank }]
    }

    return []
  })

  await Promise.all(
    patches.map(({ shoot, orderRank }) =>
      ctx.db.patch(shoot._id, { orderRank })
    )
  )
}

export async function getActiveShootByNameInCategory(
  ctx: QueryCtx | MutationCtx,
  categoryPath: string,
  name: string
) {
  const shoots = await listActiveShootsForCategory(ctx, categoryPath)

  return shoots.find((shoot) => namesMatch(shoot.name, name)) || null
}

export async function getDirectPhotoCategoryShoot(ctx: QueryCtx | MutationCtx) {
  const directCategoryShoots = await listActiveShootsForCategory(
    ctx,
    DIRECT_PHOTO_CATEGORY_PATH
  )

  return directCategoryShoots[0] || null
}

export async function setCategoryDescriptionHandler(
  ctx: MutationCtx,
  args: SetCategoryDescriptionArgs
) {
  const category = await getActiveCategoryByPath(ctx, args.categoryPath)

  if (!category) {
    throw new Error("Category not found.")
  }

  await ctx.db.patch(category._id, {
    description: normalizeCategoryDescription(args.description),
  })

  return null
}

export async function setShootCreditsHandler(
  ctx: MutationCtx,
  args: SetShootCreditsArgs
) {
  const shoot = await getActiveShootByPath(ctx, args.shootPath)

  if (!shoot) {
    throw new Error("Shoot not found.")
  }

  await ctx.db.patch(shoot._id, {
    credits: normalizeShootCredits(args.credits),
  })

  return null
}

export function normalizeDollaPath(value: string) {
  const path = value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/")

  if (!path) {
    throw new Error("Path cannot be empty.")
  }

  if (path !== ROOT_FOLDER && !path.startsWith(`${ROOT_FOLDER}/`)) {
    throw new Error(`Path must be inside ${ROOT_FOLDER}/.`)
  }

  for (const segment of path.split("/")) {
    normalizeMediaName(segment)
  }

  return path
}

export function buildCategoryPath(name: string) {
  return `${ROOT_FOLDER}/${normalizeMediaName(name)}`
}

export type SyncAsset = Infer<typeof syncAssetValidator>

export type SiteAssetInput = Infer<typeof siteAssetValidator>

export type SyncFolder = Infer<typeof syncFolderValidator>

export function assertValidAssetLayout(assetLayout: ReorderAssetLayout) {
  if (
    !Number.isInteger(assetLayout.layoutColumnCount) ||
    assetLayout.layoutColumnCount < 1 ||
    assetLayout.layoutColumnCount > MAX_MASONRY_COLUMNS
  ) {
    throw new Error("Photo layout has an invalid column count.")
  }

  if (
    !Number.isInteger(assetLayout.layoutColumn) ||
    assetLayout.layoutColumn < 0 ||
    assetLayout.layoutColumn >= assetLayout.layoutColumnCount
  ) {
    throw new Error("Photo layout has an invalid column.")
  }

  if (
    !Number.isInteger(assetLayout.layoutOrder) ||
    assetLayout.layoutOrder < 0
  ) {
    throw new Error("Photo layout has an invalid position.")
  }
}

export type MediaCategoryFolder = Pick<
  MediaCategory,
  | "path"
  | "name"
  | "displayPath"
  | "orderRank"
  | "coverShootPath"
  | "description"
>
