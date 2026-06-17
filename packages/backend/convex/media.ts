import { v, type GenericId, type Infer } from "convex/values"

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"

const ROOT_FOLDER = "Dolla"
const DIRECT_PHOTO_CATEGORY_NAME = "Mariage"
const DIRECT_PHOTO_CATEGORY_PATH = `${ROOT_FOLDER}/${DIRECT_PHOTO_CATEGORY_NAME}`
const STABLE_SHOOT_FOLDER_PREFIX = "s_"
const ORDER_STEP = 1000
const MAX_CATEGORIES = 100
const MAX_SHOOTS = 500
const MAX_ASSETS = 800
const MAX_HOME_CAROUSEL_ASSETS = 24
const MAX_CATEGORY_DESCRIPTION_LENGTH = 2000
const MAX_SHOOT_CREDITS_LENGTH = 2000
const MAX_SITE_CONTENT_BLOCKS = 40
const MAX_SITE_CONTENT_TEXT_LENGTH = 12_000
const MAX_MASONRY_COLUMNS = 4
const FORBIDDEN_FOLDER_CHARS = /[?&#\\%<>+]/

const nullableString = v.union(v.string(), v.null())
const nullableNumber = v.union(v.number(), v.null())

const folderKindValidator = v.union(
  v.literal("root"),
  v.literal("category"),
  v.literal("shoot"),
  v.literal("nested")
)

const syncFolderValidator = v.object({
  name: v.string(),
  path: v.string(),
  displayPath: v.string(),
  kind: folderKindValidator,
  depth: v.number(),
  parentPath: nullableString,
  categoryName: nullableString,
  shootName: nullableString,
})

const syncAssetValidator = v.object({
  assetId: v.string(),
  publicId: v.string(),
  folder: v.string(),
  categoryPath: nullableString,
  shootPath: v.string(),
  categoryName: nullableString,
  shootName: nullableString,
  displayName: v.string(),
  format: v.string(),
  resourceType: v.string(),
  bytes: v.number(),
  width: nullableNumber,
  height: nullableNumber,
  aspectRatio: nullableNumber,
  secureUrl: v.string(),
  thumbnailUrl: v.string(),
  previewUrl: v.string(),
  displayFolder: v.string(),
  context: v.record(v.string(), v.string()),
})

const reorderAssetLayoutValidator = v.object({
  assetId: v.string(),
  layoutColumn: v.number(),
  layoutOrder: v.number(),
  layoutColumnCount: v.number(),
})

const movedShootValidator = v.object({
  fromPath: v.string(),
  toPath: v.string(),
})

const siteContentBlockValidator = v.object({
  id: v.string(),
  kind: v.union(v.literal("paragraph"), v.literal("heading")),
  text: v.string(),
  bold: v.boolean(),
})

const siteAssetValidator = v.object({
  assetId: v.string(),
  publicId: v.string(),
  folder: v.string(),
  displayName: v.string(),
  format: v.string(),
  resourceType: v.string(),
  bytes: v.number(),
  width: nullableNumber,
  height: nullableNumber,
  aspectRatio: nullableNumber,
  secureUrl: v.string(),
  thumbnailUrl: v.string(),
  previewUrl: v.string(),
  displayFolder: v.string(),
  context: v.record(v.string(), v.string()),
})

type SyncFolder = Infer<typeof syncFolderValidator>
type SyncAsset = Infer<typeof syncAssetValidator>
type SiteAssetInput = Infer<typeof siteAssetValidator>
type ReorderAssetLayout = Infer<typeof reorderAssetLayoutValidator>
type OrderedAssetPatch = {
  assetId: string
  layoutColumn?: number
  layoutOrder?: number
  layoutColumnCount?: number
}
type SystemFields<TableName extends string> = {
  _id: GenericId<TableName>
  _creationTime: number
}
type MediaCategory = SystemFields<"mediaCategories"> & {
  path: string
  name: string
  displayPath: string
  orderRank: number
  coverShootPath: string | null
  description?: string
}
type MediaCategoryFolder = Pick<
  MediaCategory,
  | "path"
  | "name"
  | "displayPath"
  | "orderRank"
  | "coverShootPath"
  | "description"
>
type MediaShoot = SystemFields<"mediaShoots"> & {
  path: string
  categoryPath: string
  categoryName: string
  name: string
  displayPath: string
  orderRank: number
  coverAssetId: string | null
  credits?: string
}
type MediaAsset = SystemFields<"mediaAssets"> & {
  cloudinaryAssetId: string
  publicId: string
  assetFolder: string
  categoryPath: string
  shootPath: string
  categoryName: string
  shootName: string
  displayName: string
  format: string
  resourceType: string
  bytes: number
  width: number | null
  height: number | null
  aspectRatio: number | null
  secureUrl: string
  thumbnailUrl: string
  previewUrl: string
  displayFolder: string
  context: Record<string, string>
  orderRank: number
  layoutColumn?: number
  layoutOrder?: number
  layoutColumnCount?: number
  homeCarouselOrderRank?: number
}
type SiteAsset = SystemFields<"siteAssets"> & {
  key: string
  cloudinaryAssetId: string
  publicId: string
  assetFolder: string
  displayName: string
  format: string
  resourceType: string
  bytes: number
  width: number | null
  height: number | null
  aspectRatio: number | null
  secureUrl: string
  thumbnailUrl: string
  previewUrl: string
  displayFolder: string
  context: Record<string, string>
}

export const getSiteContent = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await getSiteContentByKey(ctx, args.key)

    if (!content) {
      return null
    }

    return {
      key: content.key,
      blocks: content.blocks,
    }
  },
})

export const setSiteContent = mutation({
  args: {
    key: v.string(),
    blocks: v.array(siteContentBlockValidator),
  },
  handler: async (ctx, args) => {
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
  },
})

export const getSiteAsset = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const asset = await getActiveSiteAssetByKey(ctx, args.key)

    return asset ? siteAssetView(asset) : null
  },
})

export const setSiteAsset = mutation({
  args: {
    key: v.string(),
    asset: siteAssetValidator,
  },
  handler: async (ctx, args) => {
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
  },
})

export const syncSnapshot = mutation({
  args: {
    folders: v.array(syncFolderValidator),
    assets: v.array(syncAssetValidator),
    markMissingFolders: v.boolean(),
    assetFolderPaths: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const shootFolders = args.folders.filter(
      (folder) => folder.kind === "shoot"
    )
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
  },
})

export const getLibrary = query({
  args: { folderPath: v.string() },
  handler: async (ctx, args) => {
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
  },
})

export const getHome = query({
  args: {},
  handler: async (ctx) => {
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
  },
})

export const getCategory = query({
  args: { categoryPath: v.string() },
  handler: async (ctx, args) => {
    const categories = await listActiveCategories(ctx)
    const storedCategory = await getActiveCategoryByPath(ctx, args.categoryPath)
    const category =
      storedCategory || getVirtualDirectPhotoCategory(args.categoryPath)
    const isDirectCategory =
      category !== null && isDirectPhotoCategoryPath(category.path)
    const directCategoryShoot = isDirectCategory
      ? await getDirectPhotoCategoryShoot(ctx)
      : null
    const shoots =
      category && !isDirectCategory
        ? await listActiveShootsForCategory(ctx, category.path)
        : []
    const assets =
      category && isDirectCategory
        ? await listActiveAssetsForShoot(
            ctx,
            directCategoryShoot?.path || category.path,
            MAX_ASSETS
          )
        : []
    const shootSummaries = []

    for (const shoot of shoots) {
      shootSummaries.push(await shootSummaryView(ctx, shoot))
    }

    return {
      rootFolder: ROOT_FOLDER,
      category: category
        ? categoryFolderView({
            ...category,
            coverShootPath:
              directCategoryShoot?.path || category.coverShootPath,
          })
        : null,
      categories: await buildCategorySummaries(ctx, categories),
      shoots: shootSummaries,
      assets: assets.map(assetView),
    }
  },
})

export const getShoot = query({
  args: { categoryPath: v.string(), shootPath: v.string() },
  handler: async (ctx, args) => {
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
  },
})

export const reorderCategories = mutation({
  args: {
    categoryPaths: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await patchOrderedCategories(ctx, args.categoryPaths)

    return null
  },
})

export const reorderShoots = mutation({
  args: {
    categoryPath: v.string(),
    shootPaths: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const category = await getActiveCategoryByPath(ctx, args.categoryPath)

    if (!category) {
      throw new Error("Category not found.")
    }

    await patchOrderedShoots(ctx, category.path, args.shootPaths)

    return null
  },
})

export const reorderAssets = mutation({
  args: {
    shootPath: v.string(),
    assetIds: v.optional(v.array(v.string())),
    assetLayouts: v.optional(v.array(reorderAssetLayoutValidator)),
  },
  handler: async (ctx, args) => {
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

    const orderedAssets = getOrderedAssetPatches(
      args.assetIds,
      args.assetLayouts
    )

    await patchOrderedAssets(ctx, resolvedShootPath, orderedAssets)

    return null
  },
})

export const createCategory = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
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
  },
})

export const createShoot = mutation({
  args: {
    categoryPath: v.string(),
    shootPath: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
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
      const directCategoryShoot = await getDirectPhotoCategoryShoot(ctx)

      if (!namesMatch(name, DIRECT_PHOTO_CATEGORY_NAME)) {
        throw new Error("Mariage can only contain the Mariage shoot.")
      }

      if (directCategoryShoot && directCategoryShoot.path !== shootPath) {
        throw new Error("Mariage can only contain one shoot.")
      }
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
  },
})

export const renameFolder = mutation({
  args: {
    folderPath: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
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
  },
})

export const deleteFolder = mutation({
  args: {
    folderPath: v.string(),
  },
  handler: async (ctx, args) => {
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
  },
})

export const moveShoots = mutation({
  args: {
    shootPaths: v.array(v.string()),
    targetCategoryPath: v.string(),
  },
  handler: async (ctx, args) => {
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
  },
})

export const preserveMovedShootMetadata = mutation({
  args: {
    moves: v.array(movedShootValidator),
  },
  handler: async (ctx, args) => {
    for (const move of args.moves) {
      const sourceShoot = await getShootByPath(ctx, move.fromPath)
      const targetShoot = await getShootByPath(ctx, move.toPath)

      if (!sourceShoot || !targetShoot) {
        continue
      }

      await ctx.db.patch(targetShoot._id, {
        coverAssetId: sourceShoot.coverAssetId,
        credits: sourceShoot.credits ?? "",
      })

      const sourceCategory = await getCategoryByPath(
        ctx,
        sourceShoot.categoryPath
      )

      if (sourceCategory?.coverShootPath === sourceShoot.path) {
        await ctx.db.patch(sourceCategory._id, { coverShootPath: null })
      }
    }

    return null
  },
})

export const setShootCover = mutation({
  args: {
    shootPath: v.string(),
    assetId: nullableString,
  },
  handler: async (ctx, args) => {
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
  },
})

export const setHomeCarouselAsset = mutation({
  args: {
    assetId: v.string(),
    selected: v.boolean(),
  },
  handler: async (ctx, args) => {
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
  },
})

export const setShootCredits = mutation({
  args: {
    shootPath: v.string(),
    credits: v.string(),
  },
  handler: async (ctx, args) => {
    const shoot = await getActiveShootByPath(ctx, args.shootPath)

    if (!shoot) {
      throw new Error("Shoot not found.")
    }

    await ctx.db.patch(shoot._id, {
      credits: normalizeShootCredits(args.credits),
    })

    return null
  },
})

export const setCategoryDescription = mutation({
  args: {
    categoryPath: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await getActiveCategoryByPath(ctx, args.categoryPath)

    if (!category) {
      throw new Error("Category not found.")
    }

    await ctx.db.patch(category._id, {
      description: normalizeCategoryDescription(args.description),
    })

    return null
  },
})

export const setCategoryCoverShoot = mutation({
  args: {
    categoryPath: v.string(),
    shootPath: nullableString,
  },
  handler: async (ctx, args) => {
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
  },
})

async function upsertCategories(ctx: MutationCtx, folders: SyncFolder[]) {
  const shouldBootstrapCategories =
    (await listActiveCategories(ctx)).length === 0
  let nextRank = await getNextCategoryRank(ctx)

  for (const folder of folders) {
    const existing = await getCategoryByPath(ctx, folder.path)

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: folder.name,
        displayPath: folder.displayPath,
      })
      continue
    }

    if (!shouldBootstrapCategories) {
      continue
    }

    await ctx.db.insert("mediaCategories", {
      path: folder.path,
      name: folder.name,
      displayPath: folder.displayPath,
      orderRank: nextRank,
      coverShootPath: null,
    })
    nextRank += ORDER_STEP
  }
}

async function upsertShoots(ctx: MutationCtx, folders: SyncFolder[]) {
  const shouldBootstrapShoots = (await listActiveShoots(ctx)).length === 0
  const nextRankByCategoryPath = new Map<string, number>()

  for (const folder of folders) {
    if (!folder.parentPath || !folder.categoryName) {
      continue
    }

    if (isDirectPhotoCategoryPath(folder.parentPath)) {
      continue
    }

    const existing = await getShootByPath(ctx, folder.path)

    if (existing) {
      continue
    }

    if (!shouldBootstrapShoots) {
      continue
    }

    const orderRank = await getNextShootRank(
      ctx,
      nextRankByCategoryPath,
      folder.parentPath
    )

    await ctx.db.insert("mediaShoots", {
      path: folder.path,
      categoryPath: folder.parentPath,
      categoryName: folder.categoryName,
      name: folder.name,
      displayPath: folder.displayPath,
      orderRank,
      coverAssetId: null,
      credits: "",
    })
  }
}

async function upsertAssets(ctx: MutationCtx, assets: SyncAsset[]) {
  const nextRankByShootPath = new Map<string, number>()

  for (const asset of assets) {
    const existing = await getAssetByCloudinaryAssetId(ctx, asset.assetId)
    const shoot = await getShootByPath(ctx, asset.shootPath)

    const categoryPath = shoot?.categoryPath ?? asset.categoryPath
    const categoryName = shoot?.categoryName ?? asset.categoryName
    const shootName = shoot?.name ?? asset.shootName
    const displayFolder = shoot?.name ?? asset.displayFolder

    if (!categoryPath || !categoryName || !shootName) {
      continue
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        publicId: asset.publicId,
        assetFolder: asset.folder,
        categoryPath,
        shootPath: asset.shootPath,
        categoryName,
        shootName,
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
        displayFolder,
        context: asset.context,
      })
      continue
    }

    const orderRank = await getNextAssetRank(
      ctx,
      nextRankByShootPath,
      asset.shootPath
    )

    await ctx.db.insert("mediaAssets", {
      cloudinaryAssetId: asset.assetId,
      publicId: asset.publicId,
      assetFolder: asset.folder,
      categoryPath,
      shootPath: asset.shootPath,
      categoryName,
      shootName,
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
      displayFolder,
      context: asset.context,
      orderRank,
    })
  }
}

async function markMissingShoots(
  ctx: MutationCtx,
  activeShootPaths: Set<string>
) {
  const shoots = await listActiveShoots(ctx)

  for (const shoot of shoots) {
    if (
      !activeShootPaths.has(shoot.path) &&
      !isDirectPhotoCategoryPath(shoot.categoryPath)
    ) {
      await deleteShootInConvex(ctx, shoot)
    }
  }
}

async function markMissingAssets(
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

  for (const [folderPath, activeAssetIds] of activeAssetIdsByFolder) {
    const storedAssets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_assetFolder_and_orderRank", (q) =>
        q.eq("assetFolder", folderPath)
      )
      .take(MAX_ASSETS)

    for (const asset of storedAssets) {
      if (!activeAssetIds.has(asset.cloudinaryAssetId)) {
        await ctx.db.delete(asset._id)
      }
    }
  }
}

async function patchOrderedShoots(
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

  for (const [index, shootPath] of shootPaths.entries()) {
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
      await ctx.db.patch(shoot._id, { orderRank })
    }
  }
}

async function patchOrderedCategories(
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

  for (const [index, categoryPath] of orderedKnownCategoryPaths.entries()) {
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
      await ctx.db.patch(category._id, { orderRank })
    }
  }
}

function getOrderedAssetPatches(
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

function assertValidAssetLayout(assetLayout: ReorderAssetLayout) {
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

async function patchOrderedAssets(
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

  for (const [index, orderedAsset] of orderedAssets.entries()) {
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
      await ctx.db.patch(asset._id, patch)
    }
  }
}

async function getNextCategoryRank(ctx: MutationCtx) {
  const categories = await ctx.db
    .query("mediaCategories")
    .withIndex("by_orderRank")
    .order("desc")
    .take(1)

  return (categories[0]?.orderRank || 0) + ORDER_STEP
}

async function getNextShootRank(
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

async function getNextAssetRank(
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

function normalizeMediaName(value: string) {
  const name = value.trim()

  if (!name) {
    throw new Error("Name cannot be empty.")
  }

  if (name.includes("/")) {
    throw new Error("Names cannot contain slashes.")
  }

  if (FORBIDDEN_FOLDER_CHARS.test(name)) {
    throw new Error("Names cannot contain ? & # \\ % < > or +.")
  }

  return name
}

function normalizeDollaPath(value: string) {
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

function getDollaPathDepth(path: string) {
  return Math.max(0, normalizeDollaPath(path).split("/").length - 1)
}

function getDollaPathLeaf(path: string) {
  return normalizeDollaPath(path).split("/").at(-1) || ""
}

function getUniqueDollaPaths(paths: string[]) {
  return Array.from(new Set(paths.map(normalizeDollaPath)))
}

function isStableShootPath(path: string) {
  return (
    getDollaPathDepth(path) === 1 &&
    getDollaPathLeaf(path).startsWith(STABLE_SHOOT_FOLDER_PREFIX)
  )
}

function buildCategoryPath(name: string) {
  return `${ROOT_FOLDER}/${normalizeMediaName(name)}`
}

function buildShootDisplayPath(categoryName: string, shootName: string) {
  return `${categoryName} / ${shootName}`
}

function namesMatch(first: string, second: string) {
  return first.localeCompare(second, undefined, { sensitivity: "base" }) === 0
}

async function getActiveShootByNameInCategory(
  ctx: QueryCtx | MutationCtx,
  categoryPath: string,
  name: string
) {
  const shoots = await listActiveShootsForCategory(ctx, categoryPath)

  return shoots.find((shoot) => namesMatch(shoot.name, name)) || null
}

async function renameCategoryInConvex(
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

  for (const shoot of shoots) {
    await ctx.db.patch(shoot._id, {
      categoryPath,
      categoryName: name,
      displayPath: buildShootDisplayPath(name, shoot.name),
    })
  }

  for (const asset of assets) {
    await ctx.db.patch(asset._id, {
      categoryPath,
      categoryName: name,
    })
  }
}

async function renameShootInConvex(
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

  for (const asset of assets) {
    await ctx.db.patch(asset._id, {
      shootName: name,
    })
  }
}

async function deleteCategoryInConvex(
  ctx: MutationCtx,
  category: MediaCategory
) {
  if (isDirectPhotoCategoryPath(category.path)) {
    throw new Error("Mariage cannot be deleted.")
  }

  const shoots = await listActiveShootsForCategory(ctx, category.path)

  for (const shoot of shoots) {
    await deleteShootInConvex(ctx, shoot)
  }

  await ctx.db.delete(category._id)
}

async function deleteShootInConvex(ctx: MutationCtx, shoot: MediaShoot) {
  if (isDirectPhotoCategoryPath(shoot.categoryPath)) {
    throw new Error("Mariage shoot cannot be deleted.")
  }

  const assets = await listActiveAssetsForShoot(ctx, shoot.path, MAX_ASSETS)
  const category = await getCategoryByPath(ctx, shoot.categoryPath)

  for (const asset of assets) {
    await ctx.db.delete(asset._id)
  }

  if (category?.coverShootPath === shoot.path) {
    await ctx.db.patch(category._id, { coverShootPath: null })
  }

  await ctx.db.delete(shoot._id)
}

async function moveShootsInConvex(
  ctx: MutationCtx,
  shootPaths: string[],
  targetCategory: MediaCategory
) {
  const selectedShootPathSet = new Set(shootPaths)
  const targetShoots = await listActiveShootsForCategory(
    ctx,
    targetCategory.path
  )
  const targetShootsByName = new Map(
    targetShoots.map((shoot) => [shoot.name.toLowerCase(), shoot])
  )
  const selectedNames = new Set<string>()
  const nextRankByCategoryPath = new Map<string, number>()

  for (const shootPath of shootPaths) {
    const shoot = await getActiveShootByPath(ctx, shootPath)

    if (!shoot) {
      throw new Error("Selected shoots must be active shoots.")
    }

    if (isDirectPhotoCategoryPath(shoot.categoryPath)) {
      throw new Error("Mariage shoot cannot be moved.")
    }

    if (shoot.categoryPath === targetCategory.path) {
      throw new Error("Choose a different category for the selected shoots.")
    }

    const shootNameKey = shoot.name.toLowerCase()

    if (selectedNames.has(shootNameKey)) {
      throw new Error("Selected shoots must have unique names.")
    }

    selectedNames.add(shootNameKey)

    const conflictingShoot = targetShootsByName.get(shootNameKey)

    if (conflictingShoot && !selectedShootPathSet.has(conflictingShoot.path)) {
      throw new Error(
        `"${shoot.name}" already exists in ${targetCategory.name}.`
      )
    }
  }

  for (const shootPath of shootPaths) {
    const shoot = await getActiveShootByPath(ctx, shootPath)

    if (!shoot) {
      continue
    }

    const sourceCategory = await getCategoryByPath(ctx, shoot.categoryPath)
    const assets = await listActiveAssetsForShoot(ctx, shoot.path, MAX_ASSETS)

    await ctx.db.patch(shoot._id, {
      categoryPath: targetCategory.path,
      categoryName: targetCategory.name,
      displayPath: buildShootDisplayPath(targetCategory.name, shoot.name),
      orderRank: await getNextShootRank(
        ctx,
        nextRankByCategoryPath,
        targetCategory.path
      ),
    })

    for (const asset of assets) {
      await ctx.db.patch(asset._id, {
        categoryPath: targetCategory.path,
        categoryName: targetCategory.name,
      })
    }

    if (sourceCategory?.coverShootPath === shoot.path) {
      await ctx.db.patch(sourceCategory._id, { coverShootPath: null })
    }
  }
}

function isDirectPhotoCategoryPath(path: string) {
  const segments = path.split("/")

  return (
    segments.length === 2 &&
    segments[0] === ROOT_FOLDER &&
    segments[1]?.toLowerCase() === DIRECT_PHOTO_CATEGORY_NAME.toLowerCase()
  )
}

function getVirtualDirectPhotoCategory(
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

async function buildCategorySummaries(
  ctx: QueryCtx,
  categories: MediaCategory[]
) {
  const shoots = await listActiveShoots(ctx)
  const summaries = []

  for (const category of categories) {
    const isDirectCategory = isDirectPhotoCategoryPath(category.path)
    const categoryShoots = shoots.filter(
      (shoot) => shoot.categoryPath === category.path
    )
    const directCategoryShoot = isDirectCategory
      ? categoryShoots[0] || null
      : null
    const directCategoryAssets = isDirectCategory
      ? await listActiveAssetsForShoot(
          ctx,
          directCategoryShoot?.path || category.path,
          MAX_ASSETS
        )
      : []
    const selectedShoot = isDirectCategory
      ? directCategoryShoot
      : categoryShoots.find(
          (shoot) => shoot.path === category.coverShootPath
        ) ||
        categoryShoots[0] ||
        null
    const coverAsset = isDirectCategory
      ? directCategoryAssets[0] || null
      : selectedShoot
        ? await getShootCoverAsset(ctx, selectedShoot)
        : null

    summaries.push({
      name: category.name,
      path: category.path,
      orderRank: category.orderRank,
      cover: coverAsset ? assetView(coverAsset) : null,
      shootCount: isDirectCategory ? 0 : categoryShoots.length,
      assetCount: directCategoryAssets.length,
      isDirectPhotoCategory: isDirectCategory,
    })
  }

  if (
    !categories.some((category) => isDirectPhotoCategoryPath(category.path))
  ) {
    const assets = await listActiveAssetsForShoot(
      ctx,
      DIRECT_PHOTO_CATEGORY_PATH,
      MAX_ASSETS
    )

    summaries.push({
      name: DIRECT_PHOTO_CATEGORY_NAME,
      path: DIRECT_PHOTO_CATEGORY_PATH,
      orderRank: (summaries.at(-1)?.orderRank || 0) + ORDER_STEP,
      cover: assets[0] ? assetView(assets[0]) : null,
      shootCount: 0,
      assetCount: assets.length,
      isDirectPhotoCategory: true,
    })
  }

  return summaries
}

async function getDirectPhotoCategoryShoot(ctx: QueryCtx | MutationCtx) {
  const directCategoryShoots = await listActiveShootsForCategory(
    ctx,
    DIRECT_PHOTO_CATEGORY_PATH
  )

  return directCategoryShoots[0] || null
}

async function shootSummaryView(ctx: QueryCtx, shoot: MediaShoot) {
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

async function getShootCoverAsset(ctx: QueryCtx, shoot: MediaShoot) {
  if (shoot.coverAssetId) {
    const coverAsset = await getActiveAssetByCloudinaryAssetId(
      ctx,
      shoot.coverAssetId
    )

    if (coverAsset && coverAsset.shootPath === shoot.path) {
      return coverAsset
    }
  }

  const assets = await listActiveAssetsForShoot(ctx, shoot.path, 1)

  return assets[0] || null
}

async function listActiveCategories(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("mediaCategories")
    .withIndex("by_orderRank")
    .order("asc")
    .take(MAX_CATEGORIES)
}

async function listActiveShoots(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("mediaShoots")
    .withIndex("by_orderRank")
    .order("asc")
    .take(MAX_SHOOTS)
}

async function listActiveShootsForCategory(
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

async function listActiveAssetsForShoot(
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

async function listActiveAssetsForCategory(
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

async function listActiveHomeCarouselAssets(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("mediaAssets")
    .withIndex("by_homeCarouselOrderRank", (q) =>
      q.gt("homeCarouselOrderRank", 0)
    )
    .order("asc")
    .take(MAX_HOME_CAROUSEL_ASSETS)
}

async function getNextHomeCarouselAssetRank(ctx: MutationCtx) {
  const assets = await ctx.db
    .query("mediaAssets")
    .withIndex("by_homeCarouselOrderRank", (q) =>
      q.gt("homeCarouselOrderRank", 0)
    )
    .order("desc")
    .take(1)

  return (assets[0]?.homeCarouselOrderRank || 0) + ORDER_STEP
}

async function getCategoryByPath(ctx: MutationCtx, path: string) {
  return await ctx.db
    .query("mediaCategories")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique()
}

async function getActiveCategoryByPath(
  ctx: QueryCtx | MutationCtx,
  path: string
) {
  const category = await ctx.db
    .query("mediaCategories")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique()

  return category
}

async function getShootByPath(ctx: MutationCtx, path: string) {
  return await ctx.db
    .query("mediaShoots")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique()
}

async function getActiveShootByPath(ctx: QueryCtx | MutationCtx, path: string) {
  const shoot = await ctx.db
    .query("mediaShoots")
    .withIndex("by_path", (q) => q.eq("path", path))
    .unique()

  return shoot
}

async function getAssetByCloudinaryAssetId(ctx: MutationCtx, assetId: string) {
  return await ctx.db
    .query("mediaAssets")
    .withIndex("by_cloudinaryAssetId", (q) =>
      q.eq("cloudinaryAssetId", assetId)
    )
    .unique()
}

async function getActiveAssetByCloudinaryAssetId(
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

function rootFolderView() {
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

function categoryFolderView(category: MediaCategoryFolder) {
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

function shootFolderView(shoot: MediaShoot) {
  return {
    name: shoot.name,
    path: shoot.path,
    displayPath: shoot.displayPath,
    kind: "shoot" as const,
    depth: 2,
    parentPath: shoot.categoryPath,
    categoryName: shoot.categoryName,
    shootName: shoot.name,
    orderRank: shoot.orderRank,
    coverShootPath: null,
    coverAssetId: shoot.coverAssetId,
    description: null,
    credits: shoot.credits || null,
  }
}

function assetView(asset: MediaAsset) {
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

function siteAssetView(asset: SiteAsset) {
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

function normalizeSiteContentKey(key: string) {
  const normalizedKey = key.trim()

  if (!normalizedKey) {
    throw new Error("Content key is required.")
  }

  return normalizedKey
}

async function getSiteContentByKey(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db
    .query("siteContent")
    .withIndex("by_key", (q) => q.eq("key", normalizeSiteContentKey(key)))
    .unique()
}

async function getSiteAssetByKey(ctx: QueryCtx | MutationCtx, key: string) {
  return await ctx.db
    .query("siteAssets")
    .withIndex("by_key", (q) => q.eq("key", normalizeSiteContentKey(key)))
    .unique()
}

async function getActiveSiteAssetByKey(
  ctx: QueryCtx | MutationCtx,
  key: string
) {
  const asset = await getSiteAssetByKey(ctx, key)

  return asset
}

function normalizeSiteAsset(asset: SiteAssetInput) {
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

function normalizeSiteContentBlocks(
  blocks: Array<Infer<typeof siteContentBlockValidator>>
) {
  if (blocks.length > MAX_SITE_CONTENT_BLOCKS) {
    throw new Error(
      `Content can include ${MAX_SITE_CONTENT_BLOCKS} blocks or less.`
    )
  }

  let totalLength = 0
  const normalizedBlocks = []

  for (const [index, block] of blocks.entries()) {
    const text = block.text.trim()

    if (!text) {
      continue
    }

    totalLength += text.length

    if (totalLength > MAX_SITE_CONTENT_TEXT_LENGTH) {
      throw new Error(
        `Content must be ${MAX_SITE_CONTENT_TEXT_LENGTH} characters or less.`
      )
    }

    normalizedBlocks.push({
      id: block.id.trim() || `block-${index}`,
      kind: block.kind,
      text,
      bold: block.bold,
    })
  }

  return normalizedBlocks
}

function normalizeShootCredits(credits: string) {
  const normalizedCredits = credits.trim()

  if (normalizedCredits.length > MAX_SHOOT_CREDITS_LENGTH) {
    throw new Error(
      `Credits must be ${MAX_SHOOT_CREDITS_LENGTH} characters or less.`
    )
  }

  return normalizedCredits
}

function normalizeCategoryDescription(description: string) {
  const normalizedDescription = description.trim().replace(/\s+/g, " ")

  if (normalizedDescription.length > MAX_CATEGORY_DESCRIPTION_LENGTH) {
    throw new Error(
      `Description must be ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters or less.`
    )
  }

  return normalizedDescription
}
