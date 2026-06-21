import { v2 as cloudinary } from "cloudinary"
import { Buffer } from "node:buffer"

import {
  ABOUT_IMAGE_PUBLIC_ID,
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryAsset,
  type CloudinaryUploadResult,
} from "./part-01"
import type { CloudinaryFolder } from "./part-03"
import { readArray, readString } from "./part-04"
import { buildAssetFolderExpression, normalizeDollaFolderPath } from "./part-05"
import { sortFolders } from "./part-06"
import { getFolderInfo, readRawAsset } from "./part-07"
import { mapAsset, mapFolder } from "./part-08"
import { getSyncAssetAssignment } from "./part-09"

export function mergeKnownCloudinaryFolders(
  folders: CloudinaryFolder[],
  knownFolderPaths: string[] = []
) {
  if (knownFolderPaths.length === 0) {
    return folders
  }

  const foldersByPath = new Map(folders.map((folder) => [folder.path, folder]))

  for (const knownFolderPath of knownFolderPaths) {
    const folderPath = normalizeDollaFolderPath(knownFolderPath)

    if (!foldersByPath.has(folderPath)) {
      foldersByPath.set(folderPath, mapFolder({ path: folderPath }))
    }
  }

  return sortFolders(Array.from(foldersByPath.values()))
}

export async function searchAssetsInFolders({
  folderPaths,
  imageOnly,
  maxResults,
}: {
  folderPaths: string[]
  imageOnly: boolean
  maxResults?: number
}): Promise<CloudinaryAsset[]> {
  const folders = folderPaths.map(normalizeDollaFolderPath)

  if (folders.length === 0) {
    return []
  }

  const folderExpression = buildAssetFolderExpression(folders)
  const expression = imageOnly
    ? `resource_type:image AND ${folderExpression}`
    : folderExpression
  const rawAssets: CloudinaryUploadResult[] = []
  let nextCursor: string | undefined
  const resultLimit = maxResults ?? Number.POSITIVE_INFINITY

  while (rawAssets.length < resultLimit) {
    const pageSize = Math.min(500, resultLimit - rawAssets.length)
    const search = cloudinary.search
      .expression(expression)
      .with_field(["context", "tags"])
      .max_results(pageSize)
      .sort_by("created_at", "desc")

    if (nextCursor) {
      search.next_cursor(nextCursor)
    }

    // oxlint-disable-next-line no-await-in-loop -- Cloudinary pagination needs the previous page cursor before requesting the next page.
    const response = await search.execute()
    const pageAssets = readArray(response, "resources")
      .map(readRawAsset)
      .filter((asset): asset is CloudinaryUploadResult => asset !== null)

    rawAssets.push(...pageAssets)

    nextCursor = readString(response, "next_cursor")

    if (!nextCursor || pageAssets.length === 0) {
      break
    }
  }

  return rawAssets.map(mapAsset)
}

export async function getVerifiedCloudinaryUploadAsset(uploadResult: unknown) {
  const uploadedAsset = readRawAsset(uploadResult)

  if (!uploadedAsset?.public_id || !uploadedAsset.asset_id) {
    throw new Error("Cloudinary did not return an uploaded asset.")
  }

  const response = await cloudinary.api.resource(uploadedAsset.public_id, {
    resource_type: "image",
  })
  const canonicalAsset = readRawAsset(response)

  if (!canonicalAsset) {
    throw new Error("Uploaded photo could not be verified in Cloudinary.")
  }

  if (
    !canonicalAsset.asset_id ||
    uploadedAsset.asset_id !== canonicalAsset.asset_id
  ) {
    throw new Error("Uploaded photo verification failed.")
  }

  return mapAsset(canonicalAsset)
}

export async function uploadCloudinaryAboutImage(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer())

  const result = await new Promise<CloudinaryUploadResult>(
    (resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          asset_folder: CLOUDINARY_ROOT_FOLDER,
          display_name: "About image",
          invalidate: true,
          overwrite: true,
          public_id: ABOUT_IMAGE_PUBLIC_ID,
          resource_type: "image",
          tags: ["dolla-admin", "dolla-about"],
          unique_filename: false,
          use_filename: false,
        },
        (error, response) => {
          if (error) {
            reject(error)
            return
          }

          if (!response) {
            reject(new Error("Cloudinary did not return an upload response."))
            return
          }

          resolve(response)
        }
      )

      upload.end(bytes)
    }
  )

  return mapAsset(result)
}

export function mapSyncAsset(asset: CloudinaryAsset) {
  const folderInfo = getFolderInfo(asset.folder)
  const assignment = getSyncAssetAssignment(folderInfo)

  if (!assignment) {
    return null
  }

  return {
    assetId: asset.assetId,
    publicId: asset.publicId,
    folder: asset.folder,
    categoryPath: assignment.categoryPath,
    shootPath: asset.folder,
    categoryName: assignment.categoryName,
    shootName: assignment.shootName,
    displayName: asset.displayName,
    format: asset.format,
    resourceType: asset.resourceType,
    bytes: asset.bytes,
    width: asset.width ?? null,
    height: asset.height ?? null,
    aspectRatio: asset.aspectRatio ?? null,
    secureUrl: asset.secureUrl,
    thumbnailUrl: asset.thumbnailUrl,
    previewUrl: asset.previewUrl,
    displayFolder: asset.displayFolder,
    context: asset.context,
  }
}
