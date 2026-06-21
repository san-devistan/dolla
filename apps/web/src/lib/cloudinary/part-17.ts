import { isDirectPhotoCategoryPath } from "@/lib/direct-photo-category"
import { api } from "@workspace/backend/api"

import {
  ABOUT_IMAGE_PUBLIC_ID,
  ABOUT_IMAGE_SITE_ASSET_KEY,
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryAsset,
  type ConvexMediaClient,
} from "./part-01"
import {
  type CloudinaryFolder,
  mapSiteAsset,
  validateImageFile,
} from "./part-03"
import { getGalleryAssetFolderPaths, normalizeDollaFolderPath } from "./part-05"
import { deleteCloudinaryAssets } from "./part-06"
import { getFolderInfo } from "./part-07"
import { ensureCloudinaryFolderExists } from "./part-08"
import { getConvexMediaClient } from "./part-09"
import {
  getVerifiedCloudinaryUploadAsset,
  uploadCloudinaryAboutImage,
} from "./part-11"
import {
  getRequiredConvexMediaClient,
  resolveDirectPhotoCategoryShootPath,
} from "./part-12"
import { configureCloudinary } from "./part-13"
import { syncCloudinaryMetadata } from "./part-14"
import {
  getCurrentCloudinaryAboutImage,
  isActiveConvexShootFolder,
} from "./part-15"
import { getCloudinaryAbout } from "./part-16"

export async function syncCloudinaryCatalog({
  assets,
  client,
  folders,
}: {
  assets: CloudinaryAsset[]
  client: ConvexMediaClient
  folders: CloudinaryFolder[]
}) {
  await syncCloudinaryMetadata({
    client,
    folders,
    assets,
    markMissingFolders: true,
    assetFolderPaths: getGalleryAssetFolderPaths(folders),
  })
}

export async function syncUploadedCloudinaryAsset(asset: CloudinaryAsset) {
  const convexClient = getConvexMediaClient()

  if (convexClient) {
    await syncCloudinaryMetadata({
      client: convexClient,
      folders: [],
      assets: [asset],
      markMissingFolders: false,
    })
  }

  return asset
}

export async function shouldMarkSelectedAssetFolder(folderPath: string) {
  const folderInfo = getFolderInfo(folderPath)

  if (folderInfo.kind === "shoot") {
    return true
  }

  if (isDirectPhotoCategoryPath(folderPath, CLOUDINARY_ROOT_FOLDER)) {
    return true
  }

  if (folderInfo.kind !== "category") {
    return false
  }

  return await isActiveConvexShootFolder(folderPath)
}

export async function resolveCloudinaryPhotoUploadFolderPath(
  folderPath: string
) {
  const selectedFolder = await resolveDirectPhotoCategoryShootPath(
    normalizeDollaFolderPath(folderPath)
  )
  const folderInfo = getFolderInfo(selectedFolder)
  const isRootShootFolder =
    folderInfo.kind === "category" &&
    !isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER) &&
    (await isActiveConvexShootFolder(selectedFolder))

  if (
    folderInfo.kind !== "shoot" &&
    !isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER) &&
    !isRootShootFolder
  ) {
    throw new Error("Upload photos into a shoot folder or Mariage.")
  }

  if (
    isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER)
  ) {
    await ensureCloudinaryFolderExists(selectedFolder)
  }

  return selectedFolder
}

export async function replaceCloudinaryAboutImage(file: File) {
  const convexClient = getRequiredConvexMediaClient()

  configureCloudinary()
  validateImageFile(file)

  const [previousImage, uploadedImage] = await Promise.all([
    getCurrentCloudinaryAboutImage(),
    uploadCloudinaryAboutImage(file),
  ])

  try {
    await convexClient.mutation(api.media.setSiteAsset, {
      key: ABOUT_IMAGE_SITE_ASSET_KEY,
      asset: mapSiteAsset(uploadedImage),
    })
  } catch (error) {
    await deleteCloudinaryAssets([uploadedImage]).catch(() => undefined)
    throw error
  }

  if (previousImage && previousImage.publicId !== uploadedImage.publicId) {
    await deleteCloudinaryAssets([previousImage])
  }

  return getCloudinaryAbout()
}

export async function completeCloudinaryAboutImageUpload(
  uploadResult: unknown
) {
  const convexClient = getRequiredConvexMediaClient()
  const [previousImage, uploadedImage] = await Promise.all([
    getCurrentCloudinaryAboutImage(),
    getVerifiedCloudinaryUploadAsset(uploadResult),
  ])

  if (
    uploadedImage.folder !== CLOUDINARY_ROOT_FOLDER ||
    uploadedImage.publicId !== ABOUT_IMAGE_PUBLIC_ID
  ) {
    throw new Error("Uploaded about image was stored in the wrong location.")
  }

  try {
    await convexClient.mutation(api.media.setSiteAsset, {
      key: ABOUT_IMAGE_SITE_ASSET_KEY,
      asset: mapSiteAsset(uploadedImage),
    })
  } catch (error) {
    await deleteCloudinaryAssets([uploadedImage]).catch(() => undefined)
    throw error
  }

  if (previousImage && previousImage.publicId !== uploadedImage.publicId) {
    await deleteCloudinaryAssets([previousImage])
  }

  return getCloudinaryAbout()
}
