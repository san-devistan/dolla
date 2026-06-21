import { isDirectPhotoCategoryPath } from "@/lib/direct-photo-category"
import { api } from "@workspace/backend/api"
import { v2 as cloudinary } from "cloudinary"
import { Buffer } from "node:buffer"

import {
  ABOUT_IMAGE_PUBLIC_ID,
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryDirectUploadSignature,
  type CloudinaryUploadResult,
} from "./part-01"
import { namesMatch } from "./part-02"
import { getCloudinaryUploadTimestamp } from "./part-03"
import { normalizeDollaFolderPath, normalizeFolderName } from "./part-05"
import { getFolderInfo } from "./part-07"
import { buildCategoryFolderPath, mapAsset } from "./part-08"
import { getVerifiedCloudinaryUploadAsset } from "./part-11"
import {
  createRootShootCloudinaryFolder,
  getRequiredConvexMediaClient,
} from "./part-12"
import { configureCloudinary, signCloudinaryUploadParams } from "./part-13"
import {
  completeCloudinaryAboutImageUpload,
  resolveCloudinaryPhotoUploadFolderPath,
  syncUploadedCloudinaryAsset,
} from "./part-17"
import { getCloudinaryLibrary } from "./part-19"

export async function uploadCloudinaryFile(file: File, folderPath: string) {
  configureCloudinary()

  const selectedFolder =
    await resolveCloudinaryPhotoUploadFolderPath(folderPath)
  const bytes = Buffer.from(await file.arrayBuffer())

  const result = await new Promise<CloudinaryUploadResult>(
    (resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          asset_folder: selectedFolder,
          overwrite: false,
          resource_type: "auto",
          tags: ["dolla-admin"],
          unique_filename: true,
          use_filename: true,
          use_filename_as_display_name: true,
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

  return syncUploadedCloudinaryAsset(mapAsset(result))
}

export async function createCloudinaryDirectUploadSignature({
  folderPath,
  target,
}: {
  folderPath: string
  target?: string
}): Promise<CloudinaryDirectUploadSignature> {
  configureCloudinary()

  if (target === "about-image") {
    return signCloudinaryUploadParams({
      asset_folder: CLOUDINARY_ROOT_FOLDER,
      display_name: "About image",
      invalidate: "true",
      overwrite: "true",
      public_id: ABOUT_IMAGE_PUBLIC_ID,
      tags: "dolla-admin,dolla-about",
      timestamp: getCloudinaryUploadTimestamp(),
      unique_filename: "false",
      use_filename: "false",
    })
  }

  const selectedFolder =
    await resolveCloudinaryPhotoUploadFolderPath(folderPath)

  return signCloudinaryUploadParams({
    asset_folder: selectedFolder,
    overwrite: "false",
    tags: "dolla-admin",
    timestamp: getCloudinaryUploadTimestamp(),
    unique_filename: "true",
    use_filename: "true",
    use_filename_as_display_name: "true",
  })
}

export async function completeCloudinaryDirectUpload({
  folderPath,
  target,
  uploadResult,
}: {
  folderPath: string
  target?: string
  uploadResult: unknown
}) {
  configureCloudinary()

  if (target === "about-image") {
    return {
      about: await completeCloudinaryAboutImageUpload(uploadResult),
    }
  }

  const [selectedFolder, asset] = await Promise.all([
    resolveCloudinaryPhotoUploadFolderPath(folderPath),
    getVerifiedCloudinaryUploadAsset(uploadResult),
  ])

  if (asset.folder !== selectedFolder) {
    throw new Error("Uploaded photo was stored in the wrong folder.")
  }

  return {
    assets: [await syncUploadedCloudinaryAsset(asset)],
    folderPath: selectedFolder,
  }
}

export async function createCloudinaryFolder(parentPath: string, name: string) {
  const normalizedParentPath = normalizeDollaFolderPath(parentPath)
  const parentInfo = getFolderInfo(normalizedParentPath)
  const client = getRequiredConvexMediaClient()

  if (parentInfo.kind === "root") {
    const categoryName = normalizeFolderName(name)

    await client.mutation(api.media.createCategory, {
      name: categoryName,
    })

    return getCloudinaryLibrary(buildCategoryFolderPath(categoryName))
  }

  if (parentInfo.kind !== "category") {
    throw new Error(
      "Create categories under the project or shoots in a category."
    )
  }

  if (
    isDirectPhotoCategoryPath(parentInfo.folderPath, CLOUDINARY_ROOT_FOLDER)
  ) {
    throw new Error("Mariage already has its own hidden shoot.")
  }

  const shootName = normalizeFolderName(name)
  const library = await client.query(api.media.getLibrary, {
    folderPath: CLOUDINARY_ROOT_FOLDER,
  })
  const existingShootInCategory = library.folders.some(
    (folder) =>
      folder.kind === "shoot" &&
      folder.parentPath === parentInfo.folderPath &&
      namesMatch(folder.name, shootName)
  )

  if (existingShootInCategory) {
    throw new Error("Shoot already exists in this category.")
  }

  configureCloudinary()

  const activeFolderPaths = new Set(
    library.folders.map((folder) => normalizeDollaFolderPath(folder.path))
  )
  const folderPath = await createRootShootCloudinaryFolder(activeFolderPaths)

  try {
    await client.mutation(api.media.createShoot, {
      categoryPath: parentInfo.folderPath,
      shootPath: folderPath,
      name: shootName,
    })
  } catch (error) {
    await cloudinary.api.delete_folder(folderPath).catch(() => undefined)

    throw error
  }

  return getCloudinaryLibrary(folderPath, { knownFolderPaths: [folderPath] })
}
