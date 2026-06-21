import {
  type AboutContentBlock,
  type CloudinaryAsset,
  type CloudinaryFolderKind,
  type CloudinaryRawFolder,
  type CloudinaryUploadResult,
  type ConvexSiteAssetView,
  type PricingItem,
  SHOOT_FOLDER_KEY_PREFIX,
} from "./part-01"
import { getPricingItemId, isRecord } from "./part-02"
import {
  getThumbnailSrcSet,
  getThumbnailUrl,
  readNumber,
  readObject,
  readString,
} from "./part-04"
import {
  type CloudinaryConnectionState,
  getCloudinaryErrorMessage,
  normalizeDollaFolderPath,
  normalizePricingItems,
} from "./part-05"

export function mapConvexSiteAsset(
  asset: ConvexSiteAssetView
): CloudinaryAsset {
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
    context: asset.context,
  }
}

export function parsePricingItemBlock(block: AboutContentBlock) {
  try {
    const parsed = JSON.parse(block.text)

    if (!isRecord(parsed)) {
      return []
    }

    const name = readString(parsed, "name")?.trim() ?? ""
    const description = readString(parsed, "description")?.trim() ?? ""
    const price = readString(parsed, "price")?.trim() ?? ""

    if (!name || !price) {
      return []
    }

    return [
      {
        id: block.id,
        name,
        description,
        price,
      },
    ]
  } catch {
    return []
  }
}

export function readRawFolder(value: unknown): CloudinaryRawFolder | null {
  const folderPath = readString(value, "path")

  if (!folderPath) {
    return null
  }

  return {
    name: readString(value, "name"),
    path: folderPath,
  }
}

export function readRawAsset(value: unknown): CloudinaryUploadResult | null {
  const publicId = readString(value, "public_id")

  if (!publicId) {
    return null
  }

  return {
    asset_id: readString(value, "asset_id"),
    public_id: publicId,
    asset_folder: readString(value, "asset_folder"),
    display_name: readString(value, "display_name"),
    filename: readString(value, "filename"),
    format: readString(value, "format"),
    resource_type: readString(value, "resource_type"),
    bytes: readNumber(value, "bytes"),
    width: readNumber(value, "width"),
    height: readNumber(value, "height"),
    aspect_ratio: readNumber(value, "aspect_ratio"),
    secure_url: readString(value, "secure_url"),
    context: readObject(value, "context"),
  }
}

export function getPricingContentBlocks(items: PricingItem[]) {
  return normalizePricingItems(items).map((item, index) => ({
    id: item.id || getPricingItemId(index, item.name),
    kind: "paragraph" as const,
    text: JSON.stringify({
      name: item.name,
      description: item.description,
      price: item.price,
    }),
    bold: false,
  }))
}

export function isExistingCloudinaryFolderError(error: unknown) {
  const message = getCloudinaryErrorMessage(error).toLowerCase()

  return message.includes("exists") || message.includes("already exist")
}

export function isMissingCloudinaryFolderError(error: unknown) {
  const message = getCloudinaryErrorMessage(error).toLowerCase()

  return message.includes("not found") || message.includes("does not exist")
}

export type CloudinaryConnection = CloudinaryConnectionState & {
  error?: string
}

export function getFolderInfo(value: string) {
  const folderPath = normalizeDollaFolderPath(value)
  const segments = folderPath.split("/")
  const depth = Math.max(0, segments.length - 1)
  const categoryName = segments[1]
  const shootName = segments[2]
  const isStableRootShoot =
    depth === 1 &&
    categoryName !== undefined &&
    categoryName.startsWith(SHOOT_FOLDER_KEY_PREFIX)
  const kind =
    depth === 0
      ? "root"
      : isStableRootShoot
        ? "shoot"
        : depth === 1
          ? "category"
          : depth === 2
            ? "shoot"
            : "nested"

  return {
    folderPath,
    segments,
    depth,
    kind,
    categoryName,
    shootName,
    isStableRootShoot,
    displayPath: segments.slice(1).join(" / ") || "Project",
  } satisfies {
    folderPath: string
    segments: string[]
    depth: number
    kind: CloudinaryFolderKind
    categoryName?: string
    shootName?: string
    isStableRootShoot: boolean
    displayPath: string
  }
}
