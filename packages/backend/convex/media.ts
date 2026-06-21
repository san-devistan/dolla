import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import {
  movedShootValidator,
  nullableString,
  reorderAssetLayoutValidator,
  siteContentBlockValidator,
} from "./media-part-01"
import {
  siteAssetValidator,
  syncAssetValidator,
  syncFolderValidator,
} from "./media-part-03"
import {
  preserveMovedShootMetadataHandler,
  setCategoryCoverShootHandler,
  setHomeCarouselAssetHandler,
  setShootCoverHandler,
} from "./media-part-04"
import {
  setCategoryDescriptionHandler,
  setShootCreditsHandler,
} from "./media-part-05"
import {
  getSiteContentHandler,
  reorderCategoriesHandler,
  reorderShootsHandler,
  setSiteContentHandler,
} from "./media-part-07"
import { createCategoryHandler } from "./media-part-08"
import { getSiteAssetHandler, moveShootsHandler } from "./media-part-10"
import {
  deleteFolderHandler,
  getLibraryHandler,
  renameFolderHandler,
  reorderAssetsHandler,
  setSiteAssetHandler,
  syncSnapshotHandler,
} from "./media-part-11"
import {
  createShootHandler,
  getCategoryHandler,
  getHomeHandler,
  getShootHandler,
} from "./media-part-12"

export const getSiteContent = query({
  args: {
    key: v.string(),
  },
  handler: getSiteContentHandler,
})
export const setSiteContent = mutation({
  args: {
    key: v.string(),
    blocks: v.array(siteContentBlockValidator),
  },
  handler: setSiteContentHandler,
})
export const getSiteAsset = query({
  args: {
    key: v.string(),
  },
  handler: getSiteAssetHandler,
})
export const setSiteAsset = mutation({
  args: {
    key: v.string(),
    asset: siteAssetValidator,
  },
  handler: setSiteAssetHandler,
})
export const syncSnapshot = mutation({
  args: {
    folders: v.array(syncFolderValidator),
    assets: v.array(syncAssetValidator),
    markMissingFolders: v.boolean(),
    assetFolderPaths: v.array(v.string()),
  },
  handler: syncSnapshotHandler,
})
export const getLibrary = query({
  args: { folderPath: v.string() },
  handler: getLibraryHandler,
})
export const getHome = query({
  args: {},
  handler: getHomeHandler,
})
export const getCategory = query({
  args: { categoryPath: v.string() },
  handler: getCategoryHandler,
})
export const getShoot = query({
  args: { categoryPath: v.string(), shootPath: v.string() },
  handler: getShootHandler,
})
export const reorderCategories = mutation({
  args: {
    categoryPaths: v.array(v.string()),
  },
  handler: reorderCategoriesHandler,
})
export const reorderShoots = mutation({
  args: {
    categoryPath: v.string(),
    shootPaths: v.array(v.string()),
  },
  handler: reorderShootsHandler,
})
export const reorderAssets = mutation({
  args: {
    shootPath: v.string(),
    assetIds: v.optional(v.array(v.string())),
    assetLayouts: v.optional(v.array(reorderAssetLayoutValidator)),
  },
  handler: reorderAssetsHandler,
})
export const createCategory = mutation({
  args: {
    name: v.string(),
  },
  handler: createCategoryHandler,
})
export const createShoot = mutation({
  args: {
    categoryPath: v.string(),
    shootPath: v.string(),
    name: v.string(),
  },
  handler: createShootHandler,
})
export const renameFolder = mutation({
  args: {
    folderPath: v.string(),
    name: v.string(),
  },
  handler: renameFolderHandler,
})
export const deleteFolder = mutation({
  args: {
    folderPath: v.string(),
  },
  handler: deleteFolderHandler,
})
export const moveShoots = mutation({
  args: {
    shootPaths: v.array(v.string()),
    targetCategoryPath: v.string(),
  },
  handler: moveShootsHandler,
})
export const preserveMovedShootMetadata = mutation({
  args: {
    moves: v.array(movedShootValidator),
  },
  handler: preserveMovedShootMetadataHandler,
})
export const setShootCover = mutation({
  args: {
    shootPath: v.string(),
    assetId: nullableString,
  },
  handler: setShootCoverHandler,
})
export const setHomeCarouselAsset = mutation({
  args: {
    assetId: v.string(),
    selected: v.boolean(),
  },
  handler: setHomeCarouselAssetHandler,
})
export const setShootCredits = mutation({
  args: {
    shootPath: v.string(),
    credits: v.string(),
  },
  handler: setShootCreditsHandler,
})
export const setCategoryDescription = mutation({
  args: {
    categoryPath: v.string(),
    description: v.string(),
  },
  handler: setCategoryDescriptionHandler,
})
export const setCategoryCoverShoot = mutation({
  args: {
    categoryPath: v.string(),
    shootPath: nullableString,
  },
  handler: setCategoryCoverShootHandler,
})
