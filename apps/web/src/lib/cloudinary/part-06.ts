import { isDirectPhotoCategoryPath } from "@/lib/direct-photo-category"
import { v2 as cloudinary } from "cloudinary"
import { existsSync, readFileSync } from "node:fs"

import {
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryAsset,
  type ConvexAssetView,
  DELETE_ASSET_BATCH_SIZE,
  type LocalEnv,
} from "./part-01"
import { chunkItems, getLocalEnvFiles, isCloudinaryAssetId } from "./part-02"
import {
  type CloudinaryFolder,
  type CloudinaryShootSummary,
  type ConvexFolderView,
  dedupeAssets,
  DEFAULT_ABOUT_CONTENT,
  localEnvCache,
} from "./part-03"
import { getThumbnailSrcSet, getThumbnailUrl, parseEnvFile } from "./part-04"

export function sortFolders(folders: CloudinaryFolder[]): CloudinaryFolder[] {
  const sortedFolders = folders.slice()

  sortedFolders.sort((first, second) =>
    first.path.localeCompare(second.path, undefined, { sensitivity: "base" })
  )

  return sortedFolders
}

export function chooseSelectedFolder(
  folders: CloudinaryFolder[],
  requestedFolder: string
) {
  if (requestedFolder !== CLOUDINARY_ROOT_FOLDER) {
    return requestedFolder
  }

  return (
    folders.find((folder) => folder.kind === "category")?.path ||
    CLOUDINARY_ROOT_FOLDER
  )
}

export function isDirectPhotoCategoryFolder(folder: CloudinaryFolder) {
  return isDirectPhotoCategoryPath(folder.path, CLOUDINARY_ROOT_FOLDER)
}

export function mapConvexFolder(folder: ConvexFolderView): CloudinaryFolder {
  return {
    name: folder.name,
    path: folder.path,
    displayPath: folder.displayPath,
    kind: folder.kind,
    depth: folder.depth,
    parentPath: folder.parentPath,
    categoryName: folder.categoryName || undefined,
    shootName: folder.shootName || undefined,
    orderRank: folder.orderRank,
    coverShootPath: folder.coverShootPath || undefined,
    coverAssetId: folder.coverAssetId || undefined,
    description: folder.description ?? undefined,
    credits: folder.credits || undefined,
  }
}

export function getShootSummaries({
  assets,
  shoots,
}: {
  assets: CloudinaryAsset[]
  shoots: CloudinaryFolder[]
}) {
  return shoots.map((shoot) => {
    const shootAssets = assets.filter((asset) => asset.folder === shoot.path)

    return {
      name: shoot.name,
      path: shoot.path,
      categoryName: shoot.categoryName || "",
      cover: shootAssets[0],
      assetCount: shootAssets.length,
    } satisfies CloudinaryShootSummary
  })
}

export async function deleteCloudinaryAssets(assets: CloudinaryAsset[]) {
  const uniqueAssets = dedupeAssets(assets)
  const assetIds = uniqueAssets.flatMap((asset) =>
    isCloudinaryAssetId(asset.assetId) ? [asset.assetId] : []
  )
  const publicIdsByResourceType = new Map<string, string[]>()

  for (const asset of uniqueAssets) {
    if (isCloudinaryAssetId(asset.assetId) || !asset.publicId) {
      continue
    }

    const resourceType = asset.resourceType || "image"
    const publicIds = publicIdsByResourceType.get(resourceType) || []

    publicIds.push(asset.publicId)
    publicIdsByResourceType.set(resourceType, publicIds)
  }

  await Promise.all(
    chunkItems(assetIds, DELETE_ASSET_BATCH_SIZE).map((assetIdBatch) =>
      cloudinary.api.delete_resources_by_asset_ids(assetIdBatch, {
        invalidate: true,
      })
    )
  )

  await Promise.all(
    Array.from(publicIdsByResourceType, ([resourceType, publicIds]) =>
      Promise.all(
        chunkItems(publicIds, DELETE_ASSET_BATCH_SIZE).map((publicIdBatch) =>
          cloudinary.api.delete_resources(publicIdBatch, {
            invalidate: true,
            resource_type: resourceType,
          })
        )
      )
    )
  )
}

export function getDefaultAboutContent() {
  return DEFAULT_ABOUT_CONTENT.map((block) => ({ ...block }))
}

export function getLocalEnv(): LocalEnv {
  if (localEnvCache.current) {
    return localEnvCache.current
  }

  const nextEnv: LocalEnv = {}

  for (const file of getLocalEnvFiles()) {
    if (!existsSync(file)) {
      continue
    }

    Object.assign(nextEnv, parseEnvFile(readFileSync(file, "utf8")))
  }

  localEnvCache.current = nextEnv

  return nextEnv
}

export function mapConvexAsset(asset: ConvexAssetView): CloudinaryAsset {
  return {
    assetId: asset.assetId,
    publicId: asset.publicId,
    folder: asset.folder,
    displayName: asset.displayName,
    format: asset.format,
    resourceType: asset.resourceType,
    bytes: asset.bytes,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    aspectRatio: asset.aspectRatio ?? undefined,
    secureUrl: asset.secureUrl,
    thumbnailUrl: getThumbnailUrl({
      secureUrl: asset.secureUrl,
      resourceType: asset.resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspectRatio,
    }),
    thumbnailSrcSet: getThumbnailSrcSet({
      secureUrl: asset.secureUrl,
      resourceType: asset.resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspectRatio,
    }),
    previewUrl: asset.previewUrl,
    displayFolder: asset.displayFolder,
    categoryName: asset.categoryName || undefined,
    shootName: asset.shootName || undefined,
    context: asset.context,
    orderRank: asset.orderRank,
    layoutColumn: asset.layoutColumn ?? undefined,
    layoutOrder: asset.layoutOrder ?? undefined,
    layoutColumnCount: asset.layoutColumnCount ?? undefined,
    homeCarouselOrderRank: asset.homeCarouselOrderRank ?? undefined,
  }
}
