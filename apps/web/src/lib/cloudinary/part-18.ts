import {
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryReadOptions,
  HOME_LATEST_ASSET_LIMIT,
} from "./part-01"
import { isSameOrChildFolder } from "./part-02"
import {
  findCategoryFolderByRouteSegment,
  getCloudinaryErrorMessage,
} from "./part-05"
import { getShootSummaries, isDirectPhotoCategoryFolder } from "./part-06"
import {
  buildCategoryFolderPath,
  type CloudinaryHome,
  getCategoryShootFolders,
} from "./part-08"
import { getCloudinaryConfigState, getConvexMediaClient } from "./part-09"
import { type CloudinaryCategoryPage, getCategorySummaries } from "./part-10"
import {
  configureCloudinary,
  readSyncedCategory,
  readSyncedHome,
} from "./part-13"
import { searchDollaFolders, searchDollaGalleryAssets } from "./part-14"
import { tryReadCachedHome } from "./part-15"
import { tryReadCachedCategory } from "./part-16"
import { syncCloudinaryCatalog } from "./part-17"

export async function getCloudinaryHome(
  options: CloudinaryReadOptions = {}
): Promise<CloudinaryHome> {
  const connectionState = getCloudinaryConfigState()

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      heroAssets: [],
      latestAssets: [],
    } satisfies CloudinaryHome
  }

  const cachedHome = await tryReadCachedHome({
    connection: connectionState,
    options,
  })

  if (cachedHome) {
    return cachedHome
  }

  try {
    configureCloudinary()

    const folders = await searchDollaFolders()
    const syncedAssets = await searchDollaGalleryAssets(folders)
    const latestAssets = syncedAssets.slice(0, HOME_LATEST_ASSET_LIMIT)

    const directHome = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: getCategorySummaries(folders, syncedAssets),
      heroAssets: latestAssets.slice(0, 7),
      latestAssets,
    } satisfies CloudinaryHome
    const convexClient = getConvexMediaClient()

    if (!convexClient) {
      return directHome
    }

    try {
      await syncCloudinaryCatalog({
        client: convexClient,
        folders,
        assets: syncedAssets,
      })

      return await readSyncedHome({
        client: convexClient,
        connection: connectionState,
      })
    } catch (error) {
      return {
        ...directHome,
        connection: {
          ...connectionState,
          error: `Convex metadata sync failed: ${getCloudinaryErrorMessage(error)}`,
        },
      } satisfies CloudinaryHome
    }
  } catch (error) {
    return {
      connection: {
        ...connectionState,
        error: getCloudinaryErrorMessage(error),
      },
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      heroAssets: [],
      latestAssets: [],
    } satisfies CloudinaryHome
  }
}

export async function getCloudinaryCategory(
  categoryName: string,
  options: CloudinaryReadOptions = {}
): Promise<CloudinaryCategoryPage> {
  const connectionState = getCloudinaryConfigState()

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      shoots: [],
      assets: [],
    } satisfies CloudinaryCategoryPage
  }

  const cachedCategory = await tryReadCachedCategory({
    categoryName,
    connection: connectionState,
    options,
  })

  if (cachedCategory) {
    return cachedCategory
  }

  try {
    configureCloudinary()

    const folders = await searchDollaFolders()
    const category = findCategoryFolderByRouteSegment(folders, categoryName)
    const categoryPath = category?.path || buildCategoryFolderPath(categoryName)
    const shoots = getCategoryShootFolders(folders, category)
    const syncedAssets = await searchDollaGalleryAssets(folders)
    const categoryAssets = category
      ? syncedAssets.filter((asset) =>
          isSameOrChildFolder(asset.folder, category.path)
        )
      : []
    const directCategoryAssets =
      category && isDirectPhotoCategoryFolder(category)
        ? categoryAssets.filter((asset) => asset.folder === category.path)
        : []

    const directCategoryPage = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      category,
      categories: getCategorySummaries(folders, syncedAssets),
      shoots: getShootSummaries({ assets: categoryAssets, shoots }),
      assets: directCategoryAssets,
    } satisfies CloudinaryCategoryPage
    const convexClient = getConvexMediaClient()

    if (!convexClient) {
      return directCategoryPage
    }

    try {
      await syncCloudinaryCatalog({
        client: convexClient,
        folders,
        assets: syncedAssets,
      })

      return await readSyncedCategory({
        client: convexClient,
        connection: connectionState,
        categoryPath,
      })
    } catch (error) {
      return {
        ...directCategoryPage,
        connection: {
          ...connectionState,
          error: `Convex metadata sync failed: ${getCloudinaryErrorMessage(error)}`,
        },
      } satisfies CloudinaryCategoryPage
    }
  } catch (error) {
    return {
      connection: {
        ...connectionState,
        error: getCloudinaryErrorMessage(error),
      },
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      shoots: [],
      assets: [],
    } satisfies CloudinaryCategoryPage
  }
}
