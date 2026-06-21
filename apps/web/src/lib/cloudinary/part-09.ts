import { isDirectPhotoCategoryPath } from "@/lib/direct-photo-category"
import { v2 as cloudinary } from "cloudinary"
import { ConvexHttpClient } from "convex/browser"

import { CLOUDINARY_ROOT_FOLDER, type ConvexMediaClient } from "./part-01"
import { decodeFolderRouteParam, parseCloudinaryUrl } from "./part-02"
import { createShootFolderKey } from "./part-03"
import { type CloudinaryConnectionState, normalizeFolderName } from "./part-05"
import { type getFolderInfo, isExistingCloudinaryFolderError } from "./part-07"
import {
  buildCategoryFolderPath,
  buildRootShootFolderPath,
  readServerEnv,
} from "./part-08"

export function getSyncAssetAssignment(
  folderInfo: ReturnType<typeof getFolderInfo>
) {
  const isDirectCategoryAsset = isDirectPhotoCategoryPath(
    folderInfo.folderPath,
    CLOUDINARY_ROOT_FOLDER
  )

  if (folderInfo.kind === "category" && !isDirectCategoryAsset) {
    return {
      categoryPath: null,
      categoryName: null,
      shootName: folderInfo.categoryName || null,
    }
  }

  if (isDirectCategoryAsset) {
    return {
      categoryPath: folderInfo.folderPath,
      categoryName: folderInfo.categoryName || null,
      shootName: folderInfo.categoryName || null,
    }
  }

  if (folderInfo.isStableRootShoot) {
    return {
      categoryPath: null,
      categoryName: null,
      shootName: null,
    }
  }

  if (folderInfo.kind !== "shoot" || !folderInfo.categoryName) {
    return null
  }

  if (!folderInfo.shootName) {
    return null
  }

  return {
    categoryPath: `${CLOUDINARY_ROOT_FOLDER}/${folderInfo.categoryName}`,
    categoryName: folderInfo.categoryName,
    shootName: folderInfo.shootName,
  }
}

export function buildShootFolderPath(categoryName: string, shootName: string) {
  return `${buildCategoryFolderPath(categoryName)}/${normalizeFolderName(
    decodeFolderRouteParam(shootName)
  )}`
}

export async function createRootShootCloudinaryFolderAttempt(
  activeFolderPaths: Set<string>,
  attempt: number
) {
  if (attempt >= 20) {
    throw new Error("Could not create a unique Cloudinary shoot folder.")
  }

  const folderPath = buildRootShootFolderPath(createShootFolderKey())

  if (activeFolderPaths.has(folderPath)) {
    return createRootShootCloudinaryFolderAttempt(
      activeFolderPaths,
      attempt + 1
    )
  }

  try {
    await cloudinary.api.create_folder(folderPath)

    return folderPath
  } catch (error) {
    if (!isExistingCloudinaryFolderError(error)) {
      throw error
    }

    activeFolderPaths.add(folderPath)

    return createRootShootCloudinaryFolderAttempt(
      activeFolderPaths,
      attempt + 1
    )
  }
}

export function getConvexMediaClient(): ConvexMediaClient | null {
  const convexUrl =
    readServerEnv("CONVEX_URL") || readServerEnv("VITE_CONVEX_URL")

  if (!convexUrl) {
    return null
  }

  return new ConvexHttpClient(convexUrl, { logger: false })
}

export function getCloudinaryConfigState(): CloudinaryConnectionState {
  const cloudinaryUrl = readServerEnv("CLOUDINARY_URL")

  if (cloudinaryUrl) {
    const parsedUrl = parseCloudinaryUrl(cloudinaryUrl)

    if (!parsedUrl) {
      return {
        configured: false,
        missingKeys: ["CLOUDINARY_URL"],
        rootFolder: CLOUDINARY_ROOT_FOLDER,
      }
    }

    const cloudName = parsedUrl.hostname

    return {
      configured: true,
      cloudName,
      missingKeys: [],
      rootFolder: CLOUDINARY_ROOT_FOLDER,
    }
  }

  const cloudName =
    readServerEnv("CLOUDINARY_CLOUD_NAME") ||
    readServerEnv("VITE_CLOUDINARY_CLOUD_NAME")
  const apiKey = readServerEnv("CLOUDINARY_API_KEY")
  const apiSecret = readServerEnv("CLOUDINARY_API_SECRET")
  const missingKeys = [
    ["CLOUDINARY_CLOUD_NAME", cloudName],
    ["CLOUDINARY_API_KEY", apiKey],
    ["CLOUDINARY_API_SECRET", apiSecret],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    return {
      configured: false,
      cloudName,
      missingKeys,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
    }
  }

  return {
    configured: true,
    cloudName,
    missingKeys: [],
    rootFolder: CLOUDINARY_ROOT_FOLDER,
  }
}
