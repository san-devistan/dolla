import {
  DIRECT_PHOTO_CATEGORY_NAME,
  getDirectPhotoCategoryPath,
} from "@/lib/direct-photo-category"
import { v2 as cloudinary } from "cloudinary"

import {
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryAsset,
  type CloudinaryRawFolder,
  type CloudinaryUploadResult,
} from "./part-01"
import {
  decodeFolderRouteParam,
  normalizeContext,
  withCloudinaryTransformation,
} from "./part-02"
import type { CloudinaryFolder } from "./part-03"
import { getThumbnailSrcSet, getThumbnailUrl } from "./part-04"
import { normalizeDollaFolderPath, normalizeFolderName } from "./part-05"
import { getLocalEnv, isDirectPhotoCategoryFolder } from "./part-06"
import {
  type CloudinaryConnection,
  getFolderInfo,
  isExistingCloudinaryFolderError,
} from "./part-07"

export function getUniqueFolderPaths(folderPaths: string[]) {
  const uniquePaths = new Set<string>()

  for (const folderPath of folderPaths) {
    const normalizedPath = normalizeDollaFolderPath(folderPath)

    if (normalizedPath) {
      uniquePaths.add(normalizedPath)
    }
  }

  return Array.from(uniquePaths)
}

export function buildCategoryFolderPath(categoryName: string) {
  return `${CLOUDINARY_ROOT_FOLDER}/${normalizeFolderName(
    decodeFolderRouteParam(categoryName)
  )}`
}

export function buildShootFolderPathForCategoryPath(
  categoryPath: string,
  shootName: string
) {
  return `${normalizeDollaFolderPath(categoryPath)}/${normalizeFolderName(
    decodeFolderRouteParam(shootName)
  )}`
}

export function buildRootShootFolderPath(folderKey: string) {
  return `${CLOUDINARY_ROOT_FOLDER}/${normalizeFolderName(folderKey)}`
}

export function ensureDirectPhotoCategoryFolder(folders: CloudinaryFolder[]) {
  if (folders.some((folder) => isDirectPhotoCategoryFolder(folder))) {
    return folders
  }

  return [
    ...folders,
    {
      name: DIRECT_PHOTO_CATEGORY_NAME,
      path: getDirectPhotoCategoryPath(CLOUDINARY_ROOT_FOLDER),
      displayPath: DIRECT_PHOTO_CATEGORY_NAME,
      kind: "category" as const,
      depth: 1,
      parentPath: CLOUDINARY_ROOT_FOLDER,
      categoryName: DIRECT_PHOTO_CATEGORY_NAME,
    },
  ]
}

export function getCategoryShootFolders(
  folders: CloudinaryFolder[],
  category: CloudinaryFolder | undefined
) {
  if (!category || isDirectPhotoCategoryFolder(category)) {
    return []
  }

  return folders.filter(
    (folder) => folder.kind === "shoot" && folder.parentPath === category.path
  )
}

export function readServerEnv(name: string) {
  return process.env[name] || getLocalEnv()[name]
}

export async function ensureCloudinaryFolderExists(folderPath: string) {
  try {
    await cloudinary.api.create_folder(folderPath)
  } catch (error) {
    if (!isExistingCloudinaryFolderError(error)) {
      throw error
    }
  }
}

export type CloudinaryLibrary = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  selectedFolder: string
  folders: CloudinaryFolder[]
  assets: CloudinaryAsset[]
  totalFolders: number
  totalAssets: number
}

export type CloudinaryHome = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  categories: Array<{
    name: string
    path: string
    orderRank?: number
    cover?: CloudinaryAsset | null
    shootCount: number
    assetCount: number
    isDirectPhotoCategory: boolean
  }>
  heroAssets: CloudinaryAsset[]
  latestAssets: CloudinaryAsset[]
}

export function mapFolder(folder: CloudinaryRawFolder) {
  const folderInfo = getFolderInfo(folder.path || CLOUDINARY_ROOT_FOLDER)

  return {
    name: folder.name || folderInfo.segments.at(-1) || folderInfo.folderPath,
    path: folderInfo.folderPath,
    displayPath: folderInfo.displayPath,
    kind: folderInfo.kind,
    depth: folderInfo.depth,
    parentPath: folderInfo.isStableRootShoot
      ? null
      : folderInfo.segments.length > 1
        ? folderInfo.segments.slice(0, -1).join("/")
        : null,
    categoryName: folderInfo.categoryName,
    shootName: folderInfo.shootName,
  } satisfies CloudinaryFolder
}

export function mapAsset(asset: CloudinaryUploadResult) {
  const secureUrl = asset.secure_url || ""
  const publicId = asset.public_id || ""
  const resourceType = asset.resource_type || "image"
  const format = asset.format || "asset"
  const folderInfo = getFolderInfo(asset.asset_folder || CLOUDINARY_ROOT_FOLDER)

  return {
    assetId: asset.asset_id || publicId,
    publicId,
    folder: folderInfo.folderPath,
    displayName: asset.display_name || asset.filename || publicId,
    format,
    resourceType,
    bytes: asset.bytes || 0,
    width: asset.width,
    height: asset.height,
    aspectRatio: asset.aspect_ratio,
    secureUrl,
    thumbnailUrl: getThumbnailUrl({
      secureUrl,
      resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspect_ratio,
    }),
    thumbnailSrcSet: getThumbnailSrcSet({
      secureUrl,
      resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspect_ratio,
    }),
    previewUrl:
      resourceType === "image"
        ? withCloudinaryTransformation(
            secureUrl,
            "c_limit,w_1800/f_auto/q_auto"
          )
        : secureUrl,
    displayFolder: folderInfo.displayPath,
    categoryName: folderInfo.categoryName,
    shootName: folderInfo.shootName,
    context: normalizeContext(asset.context),
  } satisfies CloudinaryAsset
}
