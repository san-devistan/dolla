import { isDirectPhotoCategoryPath } from "@/lib/direct-photo-category"
import { api } from "@workspace/backend/api"

import { CLOUDINARY_ROOT_FOLDER } from "./part-01"
import { normalizeDollaFolderPath, normalizeFolderName } from "./part-05"
import { getFolderInfo } from "./part-07"
import { buildCategoryFolderPath, getUniqueFolderPaths } from "./part-08"
import {
  getActiveConvexShootFolder,
  getRequiredConvexMediaClient,
} from "./part-12"
import { configureCloudinary } from "./part-13"
import {
  deleteCloudinaryShootFolder,
  isActiveConvexShootFolder,
} from "./part-15"
import { getCloudinaryLibrary } from "./part-19"

export async function renameCloudinaryFolder(folderPath: string, name: string) {
  const fromFolder = normalizeDollaFolderPath(folderPath)
  const folderInfo = getFolderInfo(fromFolder)
  const client = getRequiredConvexMediaClient()

  if (folderInfo.kind !== "category" && folderInfo.kind !== "shoot") {
    throw new Error("Only category and shoot folders can be renamed.")
  }

  const isRootShootFolder =
    folderInfo.kind === "category" &&
    !isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER) &&
    (await isActiveConvexShootFolder(fromFolder))

  await client.mutation(api.media.renameFolder, {
    folderPath: fromFolder,
    name: normalizeFolderName(name),
  })

  const selectedFolder =
    folderInfo.kind === "category" && !isRootShootFolder
      ? buildCategoryFolderPath(name)
      : fromFolder

  return getCloudinaryLibrary(selectedFolder)
}

export async function moveCloudinaryShoots({
  selectedFolder,
  shootPaths,
  targetCategoryPath,
}: {
  selectedFolder: string
  shootPaths: string[]
  targetCategoryPath: string
}) {
  const normalizedSelectedFolder = normalizeDollaFolderPath(selectedFolder)
  const normalizedTargetCategoryPath =
    normalizeDollaFolderPath(targetCategoryPath)
  const targetCategoryInfo = getFolderInfo(normalizedTargetCategoryPath)
  const normalizedShootPaths = getUniqueFolderPaths(shootPaths)

  if (targetCategoryInfo.kind !== "category") {
    throw new Error("Move shoots into a category folder.")
  }

  if (
    isDirectPhotoCategoryPath(
      normalizedTargetCategoryPath,
      CLOUDINARY_ROOT_FOLDER
    )
  ) {
    throw new Error(
      "Mariage displays its single shoot directly and cannot accept moved shoots."
    )
  }

  if (normalizedShootPaths.length === 0) {
    throw new Error("Select at least one shoot to move.")
  }

  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.moveShoots, {
    shootPaths: normalizedShootPaths,
    targetCategoryPath: normalizedTargetCategoryPath,
  })

  return getCloudinaryLibrary(normalizedSelectedFolder)
}

export async function deleteCloudinaryFolder(folderPath: string) {
  const normalizedPath = normalizeDollaFolderPath(folderPath)
  const folderInfo = getFolderInfo(normalizedPath)

  if (normalizedPath === CLOUDINARY_ROOT_FOLDER) {
    throw new Error("The Dolla root folder cannot be deleted.")
  }

  if (folderInfo.kind !== "category" && folderInfo.kind !== "shoot") {
    throw new Error("Only category and shoot folders can be deleted.")
  }

  const parentPath = normalizedPath.split("/").slice(0, -1).join("/")
  const client = getRequiredConvexMediaClient()
  const activeShoot = await getActiveConvexShootFolder(client, normalizedPath)

  if (activeShoot) {
    if (
      isDirectPhotoCategoryPath(activeShoot.parentPath, CLOUDINARY_ROOT_FOLDER)
    ) {
      throw new Error("Mariage shoot cannot be deleted.")
    }

    configureCloudinary()
    await deleteCloudinaryShootFolder(normalizedPath)

    await client.mutation(api.media.deleteFolder, {
      folderPath: normalizedPath,
    })

    return getCloudinaryLibrary(activeShoot.parentPath || parentPath)
  }

  if (isDirectPhotoCategoryPath(normalizedPath, CLOUDINARY_ROOT_FOLDER)) {
    throw new Error("Mariage cannot be deleted.")
  }

  const categoryPage = await client.query(api.media.getCategory, {
    categoryPath: normalizedPath,
  })

  if (!categoryPage.category) {
    throw new Error("Folder not found.")
  }

  configureCloudinary()

  await Promise.all(
    categoryPage.shoots.map((shoot) => deleteCloudinaryShootFolder(shoot.path))
  ).then(() => deleteCloudinaryShootFolder(normalizedPath))

  await client.mutation(api.media.deleteFolder, {
    folderPath: normalizedPath,
  })

  return getCloudinaryLibrary(CLOUDINARY_ROOT_FOLDER)
}
