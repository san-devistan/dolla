import { isDirectPhotoCategoryPath } from "@/lib/direct-photo-category"
import { mediaRouteSegmentMatchesName } from "@/lib/media-route-segment"

import {
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryAsset,
  CloudinaryConfigError,
  type PricingItem,
} from "./part-01"
import {
  escapeSearchValue,
  getPricingItemId,
  getUnknownErrorMessage,
  isSameOrChildFolder,
} from "./part-02"
import {
  type CloudinaryConfiguredState,
  type CloudinaryFolder,
  type CloudinaryMissingState,
  validateFolderSegment,
} from "./part-03"

export function normalizePricingItems(items: PricingItem[]) {
  return items.flatMap((item, index) => {
    const name = item.name.trim()
    const description = item.description.trim()
    const price = item.price.trim()

    if (!name || !price) {
      return []
    }

    return [
      {
        id: item.id.trim() || getPricingItemId(index, name),
        name,
        description,
        price,
      },
    ]
  })
}

export function findCategoryCoverAsset(
  assets: CloudinaryAsset[],
  categoryPath: string
) {
  return assets.find((asset) => isSameOrChildFolder(asset.folder, categoryPath))
}

export function buildAssetFolderExpression(folderPaths: string[]) {
  const quotedFolders = folderPaths.map(
    (folderPath) => `"${escapeSearchValue(folderPath)}"`
  )

  if (quotedFolders.length === 1) {
    return `asset_folder:${quotedFolders[0]}`
  }

  return `(${quotedFolders
    .map((quotedFolder) => `asset_folder:${quotedFolder}`)
    .join(" OR ")})`
}

export function getCloudinaryErrorMessage(error: unknown) {
  if (error instanceof CloudinaryConfigError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  const message = getUnknownErrorMessage(error)

  if (message) {
    return message
  }

  return "Cloudinary request failed."
}

export type CloudinaryConnectionState =
  | CloudinaryConfiguredState
  | CloudinaryMissingState

export function normalizeDollaFolderPath(value = CLOUDINARY_ROOT_FOLDER) {
  const normalized = value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/")
  const folderPath = normalized || CLOUDINARY_ROOT_FOLDER

  if (
    folderPath !== CLOUDINARY_ROOT_FOLDER &&
    !folderPath.startsWith(`${CLOUDINARY_ROOT_FOLDER}/`)
  ) {
    throw new Error(`Folder must be inside ${CLOUDINARY_ROOT_FOLDER}/.`)
  }

  for (const segment of folderPath.split("/")) {
    validateFolderSegment(segment)
  }

  return folderPath
}

export function normalizeFolderName(value: string) {
  const name = value.trim()

  validateFolderSegment(name)

  if (name.includes("/")) {
    throw new Error("Folder names cannot contain slashes.")
  }

  return name
}

export function findCategoryFolderByRouteSegment(
  folders: CloudinaryFolder[],
  categoryRouteSegment: string
) {
  return folders.find(
    (folder) =>
      folder.kind === "category" &&
      mediaRouteSegmentMatchesName(categoryRouteSegment, folder.name)
  )
}

export function findShootFolderByRouteSegment({
  category,
  folders,
  shootRouteSegment,
}: {
  category: CloudinaryFolder
  folders: CloudinaryFolder[]
  shootRouteSegment: string
}) {
  return folders.find(
    (folder) =>
      folder.kind === "shoot" &&
      folder.parentPath === category.path &&
      mediaRouteSegmentMatchesName(shootRouteSegment, folder.name)
  )
}

export function mapSyncFolder(folder: CloudinaryFolder) {
  return {
    name: folder.name,
    path: folder.path,
    displayPath: folder.displayPath,
    kind: folder.kind,
    depth: folder.depth,
    parentPath: folder.parentPath,
    categoryName: folder.categoryName || null,
    shootName: folder.shootName || null,
  }
}

export function getGalleryAssetFolderPaths(folders: CloudinaryFolder[]) {
  const folderPaths = new Set<string>()

  for (const folder of folders) {
    if (folder.kind === "category") {
      folderPaths.add(folder.path)
      continue
    }

    if (
      folder.kind === "shoot" &&
      !isDirectPhotoCategoryPath(folder.parentPath, CLOUDINARY_ROOT_FOLDER)
    ) {
      folderPaths.add(folder.path)
    }
  }

  return Array.from(folderPaths)
}

export function ensureRootFolder(folders: CloudinaryFolder[]) {
  if (folders.some((folder) => folder.path === CLOUDINARY_ROOT_FOLDER)) {
    return folders
  }

  return [
    {
      name: CLOUDINARY_ROOT_FOLDER,
      path: CLOUDINARY_ROOT_FOLDER,
      displayPath: "Project",
      kind: "root" as const,
      depth: 0,
      parentPath: null,
    },
    ...folders,
  ]
}
