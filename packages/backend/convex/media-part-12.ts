import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  DIRECT_PHOTO_CATEGORY_NAME,
  MAX_ASSETS,
  ROOT_FOLDER,
  buildShootDisplayPath,
  getActiveCategoryByPath,
  getActiveShootByPath,
  getCategoryByPath,
  getShootByPath,
  listActiveAssetsForShoot,
  namesMatch,
} from "./media-part-01"
import {
  getNextShootRank,
  isDirectPhotoCategoryPath,
  listActiveCategories,
  listActiveHomeCarouselAssets,
  listActiveShootsForCategory,
} from "./media-part-02"
import { normalizeMediaName } from "./media-part-03"
import {
  getActiveShootByNameInCategory,
  getDirectPhotoCategoryShoot,
  normalizeDollaPath,
} from "./media-part-05"
import { shootFolderView } from "./media-part-06"
import { assetView } from "./media-part-07"
import { getVirtualDirectPhotoCategory } from "./media-part-09"
import {
  buildCategorySummaries,
  categoryFolderView,
  isStableShootPath,
  shootSummaryView,
} from "./media-part-10"

type GetCategoryArgs = {
  categoryPath: string
}

type GetShootArgs = {
  categoryPath: string
  shootPath: string
}

type CreateShootArgs = {
  categoryPath: string
  shootPath: string
  name: string
}

type CategorySource =
  | Awaited<ReturnType<typeof getActiveCategoryByPath>>
  | ReturnType<typeof getVirtualDirectPhotoCategory>

async function getDirectCategoryAssets(
  ctx: QueryCtx,
  categoryPath: string,
  directCategoryShootPath: string | null
) {
  return await listActiveAssetsForShoot(
    ctx,
    directCategoryShootPath || categoryPath,
    MAX_ASSETS
  )
}

async function listCategoryShootsForView(
  ctx: QueryCtx,
  category: CategorySource
) {
  if (category === null || isDirectPhotoCategoryPath(category.path)) {
    return []
  }

  return await listActiveShootsForCategory(ctx, category.path)
}

async function listCategoryAssetsForView(
  ctx: QueryCtx,
  category: CategorySource,
  directCategoryShootPath: string | null
) {
  if (category === null || !isDirectPhotoCategoryPath(category.path)) {
    return []
  }

  return await getDirectCategoryAssets(
    ctx,
    category.path,
    directCategoryShootPath
  )
}

function categoryFolderForView(
  category: CategorySource,
  directCategoryShootPath: string | null
) {
  if (category === null) {
    return null
  }

  return categoryFolderView({
    ...category,
    coverShootPath: directCategoryShootPath || category.coverShootPath,
  })
}

async function assertDirectShootCanBeCreated(
  ctx: MutationCtx,
  name: string,
  shootPath: string
) {
  const directCategoryShoot = await getDirectPhotoCategoryShoot(ctx)

  if (!namesMatch(name, DIRECT_PHOTO_CATEGORY_NAME)) {
    throw new Error("Mariage can only contain the Mariage shoot.")
  }

  if (directCategoryShoot && directCategoryShoot.path !== shootPath) {
    throw new Error("Mariage can only contain one shoot.")
  }
}

export async function getHomeHandler(ctx: QueryCtx) {
  const [categories, latestAssets, homeCarouselAssets] = await Promise.all([
    listActiveCategories(ctx),
    ctx.db.query("mediaAssets").order("desc").take(42),
    listActiveHomeCarouselAssets(ctx),
  ])
  const categorySummaries = await buildCategorySummaries(ctx, categories)
  const heroAssets =
    homeCarouselAssets.length > 0
      ? homeCarouselAssets
      : latestAssets.slice(0, 7)

  return {
    rootFolder: ROOT_FOLDER,
    categories: categorySummaries,
    heroAssets: heroAssets.map(assetView),
    latestAssets: latestAssets.map(assetView),
  }
}

export async function getShootHandler(ctx: QueryCtx, args: GetShootArgs) {
  const categories = await listActiveCategories(ctx)
  const category = await getActiveCategoryByPath(ctx, args.categoryPath)
  const shoot = await getActiveShootByPath(ctx, args.shootPath)
  const assets =
    category && shoot && shoot.categoryPath === category.path
      ? await listActiveAssetsForShoot(ctx, shoot.path, MAX_ASSETS)
      : []

  return {
    rootFolder: ROOT_FOLDER,
    category: category ? categoryFolderView(category) : null,
    shoot:
      category && shoot && shoot.categoryPath === category.path
        ? shootFolderView(shoot)
        : null,
    categories: await buildCategorySummaries(ctx, categories),
    assets: assets.map(assetView),
  }
}

export async function getCategoryHandler(ctx: QueryCtx, args: GetCategoryArgs) {
  const categories = await listActiveCategories(ctx)
  const storedCategory = await getActiveCategoryByPath(ctx, args.categoryPath)
  const category =
    storedCategory || getVirtualDirectPhotoCategory(args.categoryPath)
  const directCategoryShoot =
    category !== null && isDirectPhotoCategoryPath(category.path)
      ? await getDirectPhotoCategoryShoot(ctx)
      : null
  const [shoots, assets, categorySummaries] = await Promise.all([
    listCategoryShootsForView(ctx, category),
    listCategoryAssetsForView(ctx, category, directCategoryShoot?.path || null),
    buildCategorySummaries(ctx, categories),
  ])
  const shootSummaries = await Promise.all(
    shoots.map((shoot) => shootSummaryView(ctx, shoot))
  )

  return {
    rootFolder: ROOT_FOLDER,
    category: categoryFolderForView(
      category,
      directCategoryShoot?.path || null
    ),
    categories: categorySummaries,
    shoots: shootSummaries,
    assets: assets.map(assetView),
  }
}

export async function createShootHandler(
  ctx: MutationCtx,
  args: CreateShootArgs
) {
  const category = await getActiveCategoryByPath(ctx, args.categoryPath)

  if (!category) {
    throw new Error("Category not found.")
  }

  const name = normalizeMediaName(args.name)
  const shootPath = normalizeDollaPath(args.shootPath)
  const isDirectCategory = isDirectPhotoCategoryPath(category.path)

  if (!isStableShootPath(shootPath)) {
    throw new Error("Shoot folder path must use a stable shoot key.")
  }

  const existingCategoryAtPath = await getCategoryByPath(ctx, shootPath)
  const existingAtPath = await getShootByPath(ctx, shootPath)
  const existingInCategory = await getActiveShootByNameInCategory(
    ctx,
    category.path,
    name
  )

  if (isDirectCategory) {
    await assertDirectShootCanBeCreated(ctx, name, shootPath)
  }

  if (existingInCategory) {
    throw new Error("Shoot already exists in this category.")
  }

  if (existingCategoryAtPath) {
    throw new Error("Shoot folder path conflicts with a category.")
  }

  if (existingAtPath) {
    throw new Error("Shoot folder path already belongs to an active shoot.")
  }

  await ctx.db.insert("mediaShoots", {
    path: shootPath,
    categoryPath: category.path,
    categoryName: category.name,
    name,
    displayPath: buildShootDisplayPath(category.name, name),
    orderRank: await getNextShootRank(ctx, new Map(), category.path),
    coverAssetId: null,
    credits: "",
  })

  if (isDirectCategory) {
    await ctx.db.patch(category._id, {
      coverShootPath: shootPath,
    })
  }

  return null
}
