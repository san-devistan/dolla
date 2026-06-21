import {
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryFolderSearchOptions,
  type CloudinaryReadOptions,
} from "./part-01"
import {
  ensureRootFolder,
  getCloudinaryErrorMessage,
  normalizeDollaFolderPath,
} from "./part-05"
import { chooseSelectedFolder } from "./part-06"
import type { CloudinaryLibrary } from "./part-08"
import { getCloudinaryConfigState, getConvexMediaClient } from "./part-09"
import {
  type CloudinaryShootPage,
  getCategorySummaries,
  readSyncedLibrary,
} from "./part-10"
import { searchAssetsInFolders } from "./part-11"
import { getShootSelection } from "./part-12"
import { configureCloudinary } from "./part-13"
import {
  getAssetsForFolder,
  readSyncedShoot,
  searchDollaFolders,
  searchDollaGalleryAssets,
  syncCloudinaryMetadata,
} from "./part-14"
import { tryReadCachedShoot } from "./part-16"
import { shouldMarkSelectedAssetFolder, syncCloudinaryCatalog } from "./part-17"

export async function getCloudinaryShoot(
  categoryName: string,
  shootName: string,
  options: CloudinaryReadOptions = {}
): Promise<CloudinaryShootPage> {
  const connectionState = getCloudinaryConfigState()

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      assets: [],
    } satisfies CloudinaryShootPage
  }

  const cachedShoot = await tryReadCachedShoot({
    categoryName,
    connection: connectionState,
    options,
    shootName,
  })

  if (cachedShoot) {
    return cachedShoot
  }

  try {
    configureCloudinary()

    const folders = await searchDollaFolders()
    const { category, categoryPath, shoot, shootPath } = getShootSelection({
      categoryName,
      folders,
      shootName,
    })
    const syncedAssets = await searchDollaGalleryAssets(folders)
    const assets = shoot
      ? syncedAssets.filter((asset) => asset.folder === shoot.path)
      : []

    const directShootPage = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      category,
      shoot,
      categories: getCategorySummaries(folders, syncedAssets),
      assets,
    } satisfies CloudinaryShootPage
    const convexClient = getConvexMediaClient()

    if (!convexClient) {
      return directShootPage
    }

    try {
      await syncCloudinaryCatalog({
        client: convexClient,
        folders,
        assets: syncedAssets,
      })

      return await readSyncedShoot({
        client: convexClient,
        connection: connectionState,
        categoryPath,
        shootPath,
      })
    } catch (error) {
      return {
        ...directShootPage,
        connection: {
          ...connectionState,
          error: `Convex metadata sync failed: ${getCloudinaryErrorMessage(error)}`,
        },
      } satisfies CloudinaryShootPage
    }
  } catch (error) {
    return {
      connection: {
        ...connectionState,
        error: getCloudinaryErrorMessage(error),
      },
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      assets: [],
    } satisfies CloudinaryShootPage
  }
}

export async function getCloudinaryLibrary(
  folderPath = CLOUDINARY_ROOT_FOLDER,
  options: CloudinaryFolderSearchOptions = {}
): Promise<CloudinaryLibrary> {
  const requestedFolder = normalizeDollaFolderPath(folderPath)
  const connectionState = getCloudinaryConfigState()

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      selectedFolder: requestedFolder,
      folders: ensureRootFolder([]),
      assets: [],
      totalFolders: 1,
      totalAssets: 0,
    } satisfies CloudinaryLibrary
  }

  try {
    configureCloudinary()

    const folders = await searchDollaFolders(options)
    const selectedFolder = chooseSelectedFolder(folders, requestedFolder)
    const assets =
      selectedFolder === CLOUDINARY_ROOT_FOLDER
        ? await searchAssetsInFolders({
            folderPaths: folders.map((folder) => folder.path),
            imageOnly: false,
            maxResults: 80,
          })
        : await getAssetsForFolder(selectedFolder)

    const directLibrary = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      selectedFolder,
      folders,
      assets,
      totalFolders: folders.length,
      totalAssets: assets.length,
    } satisfies CloudinaryLibrary
    const convexClient = getConvexMediaClient()

    if (!convexClient) {
      return directLibrary
    }

    try {
      await syncCloudinaryMetadata({
        client: convexClient,
        folders,
        assets,
        markMissingFolders: true,
        assetFolderPaths: (await shouldMarkSelectedAssetFolder(selectedFolder))
          ? [selectedFolder]
          : [],
      })

      return await readSyncedLibrary({
        client: convexClient,
        connection: connectionState,
        folderPath: selectedFolder,
      })
    } catch (error) {
      return {
        ...directLibrary,
        connection: {
          ...connectionState,
          error: `Convex metadata sync failed: ${getCloudinaryErrorMessage(error)}`,
        },
      } satisfies CloudinaryLibrary
    }
  } catch (error) {
    return {
      connection: {
        ...connectionState,
        error: getCloudinaryErrorMessage(error),
      },
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      selectedFolder: requestedFolder,
      folders: ensureRootFolder([]),
      assets: [],
      totalFolders: 1,
      totalAssets: 0,
    } satisfies CloudinaryLibrary
  }
}
