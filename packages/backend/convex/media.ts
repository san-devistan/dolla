import { v, type GenericId, type Infer } from "convex/values"

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"

const ROOT_FOLDER = "Dolla"
const ORDER_STEP = 1000
const MAX_CATEGORIES = 100
const MAX_SHOOTS = 500
const MAX_ASSETS = 800
const MAX_SHOOT_CREDITS_LENGTH = 2000
const MAX_SITE_CONTENT_BLOCKS = 40
const MAX_SITE_CONTENT_TEXT_LENGTH = 12_000

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
  createdAt: nullableString,
  updatedAt: nullableString,
  externalId: nullableString,
})

const syncAssetValidator = v.object({
  assetId: v.string(),
  publicId: v.string(),
  folder: v.string(),
  categoryPath: v.string(),
  shootPath: v.string(),
  categoryName: v.string(),
  shootName: v.string(),
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
  createdAt: nullableString,
  context: v.record(v.string(), v.string()),
})

const siteContentBlockValidator = v.object({
  id: v.string(),
  kind: v.union(v.literal("paragraph"), v.literal("heading")),
  text: v.string(),
  bold: v.boolean(),
})

type SyncFolder = Infer<typeof syncFolderValidator>
type SyncAsset = Infer<typeof syncAssetValidator>
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
  cloudinaryExternalId: string | null
  cloudinaryCreatedAt: string | null
  cloudinaryUpdatedAt: string | null
  syncedAt: number
  deletedAt: number | null
}
type MediaShoot = SystemFields<"mediaShoots"> & {
  path: string
  categoryPath: string
  categoryName: string
  name: string
  displayPath: string
  orderRank: number
  coverAssetId: string | null
  credits?: string
  cloudinaryExternalId: string | null
  cloudinaryCreatedAt: string | null
  cloudinaryUpdatedAt: string | null
  syncedAt: number
  deletedAt: number | null
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
  createdAt: string | null
  context: Record<string, string>
  orderRank: number
  syncedAt: number
  deletedAt: number | null
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
      updatedAt: content.updatedAt,
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
    const updatedAt = Date.now()

    if (content) {
      await ctx.db.patch(content._id, { blocks, updatedAt })
    } else {
      await ctx.db.insert("siteContent", {
        key: normalizeSiteContentKey(args.key),
        blocks,
        updatedAt,
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
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const categoryFolders = args.folders.filter(
      (folder) => folder.kind === "category"
    )
    const shootFolders = args.folders.filter(
      (folder) => folder.kind === "shoot"
    )
    const activeCategoryPaths = new Set(
      categoryFolders.map((folder) => folder.path)
    )
    const activeShootPaths = new Set(shootFolders.map((folder) => folder.path))

    await upsertCategories(ctx, categoryFolders, args.syncedAt)
    await upsertShoots(ctx, shootFolders, args.syncedAt)
    await upsertAssets(ctx, args.assets, args.syncedAt)

    if (args.markMissingFolders) {
      await markMissingCategories(ctx, activeCategoryPaths, args.syncedAt)
      await markMissingShoots(ctx, activeShootPaths, args.syncedAt)
    }

    if (args.assetFolderPaths.length > 0) {
      await markMissingAssets(
        ctx,
        args.assetFolderPaths,
        args.assets,
        args.syncedAt
      )
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
    const assets = selectedShoot
      ? await listActiveAssetsForShoot(ctx, selectedShoot.path, MAX_ASSETS)
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
    const categories = await listActiveCategories(ctx)
    const latestAssets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_deletedAt_and_createdAt", (q) => q.eq("deletedAt", null))
      .order("desc")
      .take(42)
    const categorySummaries = await buildCategorySummaries(ctx, categories)

    return {
      rootFolder: ROOT_FOLDER,
      categories: categorySummaries,
      heroAssets: latestAssets.slice(0, 7).map(assetView),
      latestAssets: latestAssets.map(assetView),
    }
  },
})

export const getCategory = query({
  args: { categoryPath: v.string() },
  handler: async (ctx, args) => {
    const categories = await listActiveCategories(ctx)
    const category = await getActiveCategoryByPath(ctx, args.categoryPath)
    const shoots = category
      ? await listActiveShootsForCategory(ctx, category.path)
      : []
    const shootSummaries = []

    for (const shoot of shoots) {
      shootSummaries.push(await shootSummaryView(ctx, shoot))
    }

    return {
      rootFolder: ROOT_FOLDER,
      category: category ? categoryFolderView(category) : null,
      categories: await buildCategorySummaries(ctx, categories),
      shoots: shootSummaries,
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
    assetIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const shoot = await getActiveShootByPath(ctx, args.shootPath)

    if (!shoot) {
      throw new Error("Shoot not found.")
    }

    await patchOrderedAssets(ctx, shoot.path, args.assetIds)

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

async function upsertCategories(
  ctx: MutationCtx,
  folders: SyncFolder[],
  syncedAt: number
) {
  let nextRank = await getNextCategoryRank(ctx)

  for (const folder of folders) {
    const existing = await getCategoryByPath(ctx, folder.path)

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: folder.name,
        displayPath: folder.displayPath,
        cloudinaryExternalId: folder.externalId,
        cloudinaryCreatedAt: folder.createdAt,
        cloudinaryUpdatedAt: folder.updatedAt,
        syncedAt,
        deletedAt: null,
      })
      continue
    }

    await ctx.db.insert("mediaCategories", {
      path: folder.path,
      name: folder.name,
      displayPath: folder.displayPath,
      orderRank: nextRank,
      coverShootPath: null,
      cloudinaryExternalId: folder.externalId,
      cloudinaryCreatedAt: folder.createdAt,
      cloudinaryUpdatedAt: folder.updatedAt,
      syncedAt,
      deletedAt: null,
    })
    nextRank += ORDER_STEP
  }
}

async function upsertShoots(
  ctx: MutationCtx,
  folders: SyncFolder[],
  syncedAt: number
) {
  const nextRankByCategoryPath = new Map<string, number>()

  for (const folder of folders) {
    if (!folder.parentPath || !folder.categoryName) {
      continue
    }

    const existing = await getShootByPath(ctx, folder.path)

    if (existing) {
      await ctx.db.patch(existing._id, {
        categoryPath: folder.parentPath,
        categoryName: folder.categoryName,
        name: folder.name,
        displayPath: folder.displayPath,
        cloudinaryExternalId: folder.externalId,
        cloudinaryCreatedAt: folder.createdAt,
        cloudinaryUpdatedAt: folder.updatedAt,
        syncedAt,
        deletedAt: null,
      })
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
      cloudinaryExternalId: folder.externalId,
      cloudinaryCreatedAt: folder.createdAt,
      cloudinaryUpdatedAt: folder.updatedAt,
      syncedAt,
      deletedAt: null,
    })
  }
}

async function upsertAssets(
  ctx: MutationCtx,
  assets: SyncAsset[],
  syncedAt: number
) {
  const nextRankByShootPath = new Map<string, number>()

  for (const asset of assets) {
    const existing = await getAssetByCloudinaryAssetId(ctx, asset.assetId)

    if (existing) {
      await ctx.db.patch(existing._id, {
        publicId: asset.publicId,
        assetFolder: asset.folder,
        categoryPath: asset.categoryPath,
        shootPath: asset.shootPath,
        categoryName: asset.categoryName,
        shootName: asset.shootName,
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
        createdAt: asset.createdAt,
        context: asset.context,
        syncedAt,
        deletedAt: null,
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
      categoryPath: asset.categoryPath,
      shootPath: asset.shootPath,
      categoryName: asset.categoryName,
      shootName: asset.shootName,
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
      createdAt: asset.createdAt,
      context: asset.context,
      orderRank,
      syncedAt,
      deletedAt: null,
    })
  }
}

async function markMissingCategories(
  ctx: MutationCtx,
  activeCategoryPaths: Set<string>,
  syncedAt: number
) {
  const categories = await listActiveCategories(ctx)

  for (const category of categories) {
    if (!activeCategoryPaths.has(category.path)) {
      await ctx.db.patch(category._id, { syncedAt, deletedAt: syncedAt })
    }
  }
}

async function markMissingShoots(
  ctx: MutationCtx,
  activeShootPaths: Set<string>,
  syncedAt: number
) {
  const shoots = await listActiveShoots(ctx)

  for (const shoot of shoots) {
    if (!activeShootPaths.has(shoot.path)) {
      await ctx.db.patch(shoot._id, { syncedAt, deletedAt: syncedAt })
    }
  }
}

async function markMissingAssets(
  ctx: MutationCtx,
  assetFolderPaths: string[],
  assets: SyncAsset[],
  syncedAt: number
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
      .withIndex("by_assetFolder_and_deletedAt_and_orderRank", (q) =>
        q.eq("assetFolder", folderPath).eq("deletedAt", null)
      )
      .take(MAX_ASSETS)

    for (const asset of storedAssets) {
      if (!activeAssetIds.has(asset.cloudinaryAssetId)) {
        await ctx.db.patch(asset._id, { syncedAt, deletedAt: syncedAt })
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
  const seenCategoryPaths = new Set<string>()

  if (categoryPaths.length !== categories.length) {
    throw new Error("Category order must include every category.")
  }

  for (const [index, categoryPath] of categoryPaths.entries()) {
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

async function patchOrderedAssets(
  ctx: MutationCtx,
  shootPath: string,
  assetIds: string[]
) {
  const assets = await listActiveAssetsForShoot(ctx, shootPath, MAX_ASSETS)
  const assetsById = new Map(
    assets.map((asset) => [asset.cloudinaryAssetId, asset])
  )
  const seenAssetIds = new Set<string>()

  if (assetIds.length !== assets.length) {
    throw new Error("Photo order must include every photo in the shoot.")
  }

  for (const [index, assetId] of assetIds.entries()) {
    if (seenAssetIds.has(assetId)) {
      throw new Error("Photo order cannot include the same photo twice.")
    }

    seenAssetIds.add(assetId)

    const asset = assetsById.get(assetId)

    if (!asset) {
      throw new Error("Photo order can only include photos in the shoot.")
    }

    const orderRank = (index + 1) * ORDER_STEP

    if (asset.orderRank !== orderRank) {
      await ctx.db.patch(asset._id, { orderRank })
    }
  }
}

async function getNextCategoryRank(ctx: MutationCtx) {
  const categories = await ctx.db
    .query("mediaCategories")
    .withIndex("by_deletedAt_and_orderRank", (q) => q.eq("deletedAt", null))
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
    .withIndex("by_categoryPath_and_deletedAt_and_orderRank", (q) =>
      q.eq("categoryPath", categoryPath).eq("deletedAt", null)
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
    .withIndex("by_shootPath_and_deletedAt_and_orderRank", (q) =>
      q.eq("shootPath", shootPath).eq("deletedAt", null)
    )
    .order("desc")
    .take(1)
  const nextRank = (assets[0]?.orderRank || 0) + ORDER_STEP

  nextRankByShootPath.set(shootPath, nextRank + ORDER_STEP)

  return nextRank
}

async function buildCategorySummaries(
  ctx: QueryCtx,
  categories: MediaCategory[]
) {
  const shoots = await listActiveShoots(ctx)
  const summaries = []

  for (const category of categories) {
    const categoryShoots = shoots.filter(
      (shoot) => shoot.categoryPath === category.path
    )
    const selectedShoot =
      categoryShoots.find((shoot) => shoot.path === category.coverShootPath) ||
      categoryShoots[0] ||
      null
    const coverAsset = selectedShoot
      ? await getShootCoverAsset(ctx, selectedShoot)
      : null

    summaries.push({
      name: category.name,
      path: category.path,
      orderRank: category.orderRank,
      cover: coverAsset ? assetView(coverAsset) : null,
      shootCount: categoryShoots.length,
    })
  }

  return summaries
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
    .withIndex("by_deletedAt_and_orderRank", (q) => q.eq("deletedAt", null))
    .order("asc")
    .take(MAX_CATEGORIES)
}

async function listActiveShoots(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("mediaShoots")
    .withIndex("by_deletedAt_and_orderRank", (q) => q.eq("deletedAt", null))
    .order("asc")
    .take(MAX_SHOOTS)
}

async function listActiveShootsForCategory(
  ctx: QueryCtx | MutationCtx,
  categoryPath: string
) {
  return await ctx.db
    .query("mediaShoots")
    .withIndex("by_categoryPath_and_deletedAt_and_orderRank", (q) =>
      q.eq("categoryPath", categoryPath).eq("deletedAt", null)
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
    .withIndex("by_shootPath_and_deletedAt_and_orderRank", (q) =>
      q.eq("shootPath", shootPath).eq("deletedAt", null)
    )
    .order("asc")
    .take(limit)
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

  return category && category.deletedAt === null ? category : null
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

  return shoot && shoot.deletedAt === null ? shoot : null
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

  return asset && asset.deletedAt === null ? asset : null
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
    createdAt: null,
    updatedAt: null,
    externalId: null,
    orderRank: 0,
    coverShootPath: null,
    coverAssetId: null,
    credits: null,
  }
}

function categoryFolderView(category: MediaCategory) {
  return {
    name: category.name,
    path: category.path,
    displayPath: category.displayPath,
    kind: "category" as const,
    depth: 1,
    parentPath: ROOT_FOLDER,
    categoryName: category.name,
    shootName: null,
    createdAt: category.cloudinaryCreatedAt,
    updatedAt: category.cloudinaryUpdatedAt,
    externalId: category.cloudinaryExternalId,
    orderRank: category.orderRank,
    coverShootPath: category.coverShootPath,
    coverAssetId: null,
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
    createdAt: shoot.cloudinaryCreatedAt,
    updatedAt: shoot.cloudinaryUpdatedAt,
    externalId: shoot.cloudinaryExternalId,
    orderRank: shoot.orderRank,
    coverShootPath: null,
    coverAssetId: shoot.coverAssetId,
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
    createdAt: asset.createdAt,
    context: asset.context,
    orderRank: asset.orderRank,
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
