import { api } from "@workspace/backend/api"

import {
  type AboutContentBlock,
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryAdminCredentials,
  type CloudinaryAsset,
  CloudinaryConfigError,
  type ConvexMediaClient,
  type PricingItem,
} from "./part-01"
import { parseCloudinaryUrl } from "./part-02"
import type { CloudinaryFolder, CloudinaryShootSummary } from "./part-03"
import type { ConvexCategorySummaryView } from "./part-04"
import { findCategoryCoverAsset } from "./part-05"
import {
  isDirectPhotoCategoryFolder,
  mapConvexAsset,
  mapConvexFolder,
} from "./part-06"
import type { CloudinaryConnection } from "./part-07"
import {
  type CloudinaryHome,
  type CloudinaryLibrary,
  readServerEnv,
} from "./part-08"

export function getCloudinaryAdminCredentials(): CloudinaryAdminCredentials {
  const cloudinaryUrl = readServerEnv("CLOUDINARY_URL")

  if (cloudinaryUrl) {
    const parsedUrl = parseCloudinaryUrl(cloudinaryUrl)

    if (!parsedUrl) {
      throw new Error(
        "CLOUDINARY_URL must use cloudinary://<api-key>:<api-secret>@<cloud-name>."
      )
    }

    return {
      cloudName: parsedUrl.hostname,
      apiKey: decodeURIComponent(parsedUrl.username),
      apiSecret: decodeURIComponent(parsedUrl.password),
    }
  }

  const cloudName =
    readServerEnv("CLOUDINARY_CLOUD_NAME") ||
    readServerEnv("VITE_CLOUDINARY_CLOUD_NAME")
  const apiKey = readServerEnv("CLOUDINARY_API_KEY")
  const apiSecret = readServerEnv("CLOUDINARY_API_SECRET")

  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryConfigError(
      [
        ["CLOUDINARY_CLOUD_NAME", cloudName],
        ["CLOUDINARY_API_KEY", apiKey],
        ["CLOUDINARY_API_SECRET", apiSecret],
      ]
        .filter(([, value]) => !value)
        .map(([key]) => key)
    )
  }

  return { cloudName, apiKey, apiSecret }
}

export async function readSyncedLibrary({
  client,
  connection,
  folderPath,
}: {
  client: ConvexMediaClient
  connection: CloudinaryConnection
  folderPath: string
}): Promise<CloudinaryLibrary> {
  const library = await client.query(api.media.getLibrary, { folderPath })

  return {
    connection,
    rootFolder: CLOUDINARY_ROOT_FOLDER,
    selectedFolder: library.selectedFolder,
    folders: library.folders.map(mapConvexFolder),
    assets: library.assets.map(mapConvexAsset),
    totalFolders: library.totalFolders,
    totalAssets: library.totalAssets,
  }
}

export type CloudinaryCategoryPage = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  category?: CloudinaryFolder | null
  categories: CloudinaryHome["categories"]
  shoots: CloudinaryShootSummary[]
  assets: CloudinaryAsset[]
}

export type CloudinaryShootPage = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  category?: CloudinaryFolder | null
  shoot?: CloudinaryFolder | null
  categories: CloudinaryHome["categories"]
  assets: CloudinaryAsset[]
}

export type CloudinaryAbout = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  categories: CloudinaryHome["categories"]
  image?: CloudinaryAsset
  content: AboutContentBlock[]
}

export type CloudinaryPricing = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  categories: CloudinaryHome["categories"]
  items: PricingItem[]
}

export function mapConvexCategorySummary(
  category: ConvexCategorySummaryView
): CloudinaryHome["categories"][number] {
  return {
    name: category.name,
    path: category.path,
    orderRank: category.orderRank,
    cover: category.cover ? mapConvexAsset(category.cover) : null,
    shootCount: category.shootCount,
    assetCount: category.assetCount || 0,
    isDirectPhotoCategory: category.isDirectPhotoCategory === true,
  }
}

export function hasCachedHomeData(home: CloudinaryHome) {
  return (
    home.categories.length > 0 ||
    home.heroAssets.length > 0 ||
    home.latestAssets.length > 0
  )
}

export function getCategorySummaries(
  folders: CloudinaryFolder[],
  latestAssets: CloudinaryAsset[]
): CloudinaryHome["categories"] {
  const shootCountsByCategoryPath = new Map<string, number>()
  const assetsByFolder = new Map<string, CloudinaryAsset[]>()

  for (const folder of folders) {
    if (folder.parentPath) {
      shootCountsByCategoryPath.set(
        folder.parentPath,
        (shootCountsByCategoryPath.get(folder.parentPath) || 0) + 1
      )
    }
  }

  for (const asset of latestAssets) {
    const folderAssets = assetsByFolder.get(asset.folder) || []

    folderAssets.push(asset)
    assetsByFolder.set(asset.folder, folderAssets)
  }

  return folders.flatMap((folder) => {
    if (folder.kind !== "category") {
      return []
    }

    const isDirectPhotoCategory = isDirectPhotoCategoryFolder(folder)
    const directAssets = isDirectPhotoCategory
      ? assetsByFolder.get(folder.path) || []
      : []

    return [
      {
        name: folder.name,
        path: folder.path,
        orderRank: folder.orderRank,
        cover: findCategoryCoverAsset(latestAssets, folder.path),
        shootCount: isDirectPhotoCategory
          ? 0
          : shootCountsByCategoryPath.get(folder.path) || 0,
        assetCount: directAssets.length,
        isDirectPhotoCategory,
      },
    ]
  })
}
