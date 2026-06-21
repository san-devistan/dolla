import { isDirectPhotoCategoryPath } from "@/lib/direct-photo-category"
import { api } from "@workspace/backend/api"

import {
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryAsset,
  type CloudinaryFolderSearchOptions,
  type ConvexMediaClient,
} from "./part-01"
import {
  type CloudinaryFolder,
  getFolderSearchBuilder,
  isDollaFolderPath,
} from "./part-03"
import { readArray } from "./part-04"
import {
  ensureRootFolder,
  getGalleryAssetFolderPaths,
  mapSyncFolder,
  normalizeDollaFolderPath,
} from "./part-05"
import { mapConvexAsset, mapConvexFolder, sortFolders } from "./part-06"
import { type CloudinaryConnection, readRawFolder } from "./part-07"
import { ensureDirectPhotoCategoryFolder, mapFolder } from "./part-08"
import { type CloudinaryShootPage, mapConvexCategorySummary } from "./part-10"
import {
  mapSyncAsset,
  mergeKnownCloudinaryFolders,
  searchAssetsInFolders,
} from "./part-11"
import { getRequiredConvexMediaClient } from "./part-12"

export async function readSyncedShoot({
  client,
  connection,
  categoryPath,
  shootPath,
}: {
  client: ConvexMediaClient
  connection: CloudinaryConnection
  categoryPath: string
  shootPath: string
}): Promise<CloudinaryShootPage> {
  const shootPage = await client.query(api.media.getShoot, {
    categoryPath,
    shootPath,
  })

  return {
    connection,
    rootFolder: CLOUDINARY_ROOT_FOLDER,
    category: shootPage.category ? mapConvexFolder(shootPage.category) : null,
    shoot: shootPage.shoot ? mapConvexFolder(shootPage.shoot) : null,
    categories: shootPage.categories.map(mapConvexCategorySummary),
    assets: shootPage.assets.map(mapConvexAsset),
  }
}

export async function searchDollaFolders(
  options: CloudinaryFolderSearchOptions = {}
): Promise<CloudinaryFolder[]> {
  const response = await getFolderSearchBuilder()
    .expression(`path:${CLOUDINARY_ROOT_FOLDER}*`)
    .max_results(500)
    .execute()
  const folders = readArray(response, "folders").flatMap((folder) => {
    const rawFolder = readRawFolder(folder)

    return rawFolder && isDollaFolderPath(rawFolder.path || "")
      ? [mapFolder(rawFolder)]
      : []
  })

  return mergeKnownCloudinaryFolders(
    sortFolders(ensureDirectPhotoCategoryFolder(ensureRootFolder(folders))),
    options.knownFolderPaths
  )
}

export async function searchDollaGalleryAssets(folders: CloudinaryFolder[]) {
  const assetFolderPaths = getGalleryAssetFolderPaths(folders)

  if (assetFolderPaths.length === 0) {
    return []
  }

  return await searchAssetsInFolders({
    folderPaths: assetFolderPaths,
    imageOnly: true,
  })
}

export async function getAssetsForFolder(
  folderPath: string
): Promise<CloudinaryAsset[]> {
  return searchAssetsInFolders({
    folderPaths: [folderPath],
    imageOnly: false,
    maxResults: 80,
  })
}

export async function syncCloudinaryMetadata({
  client,
  folders,
  assets,
  markMissingFolders,
  assetFolderPaths = [],
}: {
  client: ConvexMediaClient
  folders: CloudinaryFolder[]
  assets: CloudinaryAsset[]
  markMissingFolders: boolean
  assetFolderPaths?: string[]
}) {
  await client.mutation(api.media.syncSnapshot, {
    folders: folders.flatMap((folder) => {
      const shouldSync =
        folder.kind === "category" ||
        (folder.kind === "shoot" &&
          !isDirectPhotoCategoryPath(folder.parentPath, CLOUDINARY_ROOT_FOLDER))

      return shouldSync ? [mapSyncFolder(folder)] : []
    }),
    assets: assets.flatMap((asset) => {
      const syncAsset = mapSyncAsset(asset)

      return syncAsset ? [syncAsset] : []
    }),
    markMissingFolders,
    assetFolderPaths,
  })
}

export async function reorderCloudinaryShoots({
  categoryPath,
  shootPaths,
}: {
  categoryPath: string
  shootPaths: string[]
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.reorderShoots, {
    categoryPath: normalizeDollaFolderPath(categoryPath),
    shootPaths: shootPaths.map(normalizeDollaFolderPath),
  })

  return null
}

export async function reorderCloudinaryCategories({
  categoryPaths,
}: {
  categoryPaths: string[]
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.reorderCategories, {
    categoryPaths: categoryPaths.map(normalizeDollaFolderPath),
  })

  return null
}

export async function setCloudinaryShootCover({
  shootPath,
  assetId,
}: {
  shootPath: string
  assetId: string
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setShootCover, {
    shootPath: normalizeDollaFolderPath(shootPath),
    assetId,
  })

  return null
}

export async function setCloudinaryHomeCarouselAsset({
  assetId,
  selected,
}: {
  assetId: string
  selected: boolean
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setHomeCarouselAsset, {
    assetId,
    selected,
  })

  return null
}
