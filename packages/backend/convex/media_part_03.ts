import { type Infer, v } from "convex/values"

import {
  FORBIDDEN_FOLDER_CHARS,
  MAX_SITE_CONTENT_BLOCKS,
  MAX_SITE_CONTENT_TEXT_LENGTH,
  type SystemFields,
  folderKindValidator,
  nullableNumber,
  nullableString,
  type reorderAssetLayoutValidator,
  type siteContentBlockValidator,
} from "./media_part_01"

export function normalizeMediaName(value: string) {
  const name = value.trim()

  if (!name) {
    throw new Error("Name cannot be empty.")
  }

  if (name.includes("/")) {
    throw new Error("Names cannot contain slashes.")
  }

  if (FORBIDDEN_FOLDER_CHARS.test(name)) {
    throw new Error("Names cannot contain ? & # \\ % < > or +.")
  }

  return name
}

export const syncAssetValidator = v.object({
  assetId: v.string(),
  publicId: v.string(),
  folder: v.string(),
  categoryPath: nullableString,
  shootPath: v.string(),
  categoryName: nullableString,
  shootName: nullableString,
  displayName: v.string(),
  format: v.string(),
  resourceType: v.string(),
  bytes: v.number(),
  width: nullableNumber,
  height: nullableNumber,
  aspectRatio: nullableNumber,
  secureUrl: v.string(),
  thumbnailUrl: v.string(),
  previewUrl: v.string(),
  displayFolder: v.string(),
  context: v.record(v.string(), v.string()),
})

export const siteAssetValidator = v.object({
  assetId: v.string(),
  publicId: v.string(),
  folder: v.string(),
  displayName: v.string(),
  format: v.string(),
  resourceType: v.string(),
  bytes: v.number(),
  width: nullableNumber,
  height: nullableNumber,
  aspectRatio: nullableNumber,
  secureUrl: v.string(),
  thumbnailUrl: v.string(),
  previewUrl: v.string(),
  displayFolder: v.string(),
  context: v.record(v.string(), v.string()),
})

export const syncFolderValidator = v.object({
  name: v.string(),
  path: v.string(),
  displayPath: v.string(),
  kind: folderKindValidator,
  depth: v.number(),
  parentPath: nullableString,
  categoryName: nullableString,
  shootName: nullableString,
})

export type ReorderAssetLayout = Infer<typeof reorderAssetLayoutValidator>

export function normalizeSiteContentBlocks(
  blocks: Array<Infer<typeof siteContentBlockValidator>>
) {
  if (blocks.length > MAX_SITE_CONTENT_BLOCKS) {
    throw new Error(
      `Content can include ${MAX_SITE_CONTENT_BLOCKS} blocks or less.`
    )
  }

  let totalLength = 0
  const normalizedBlocks = []

  for (const [index, block] of blocks.entries()) {
    const text = block.text.trim()

    if (!text) {
      continue
    }

    totalLength += text.length

    if (totalLength > MAX_SITE_CONTENT_TEXT_LENGTH) {
      throw new Error(
        `Content must be ${MAX_SITE_CONTENT_TEXT_LENGTH} characters or less.`
      )
    }

    normalizedBlocks.push({
      id: block.id.trim() || `block-${index}`,
      kind: block.kind,
      text,
      bold: block.bold,
    })
  }

  return normalizedBlocks
}

export type MediaCategory = SystemFields<"mediaCategories"> & {
  path: string
  name: string
  displayPath: string
  orderRank: number
  coverShootPath: string | null
  description?: string
}

export type MediaShoot = SystemFields<"mediaShoots"> & {
  path: string
  categoryPath: string
  categoryName: string
  name: string
  displayPath: string
  orderRank: number
  coverAssetId: string | null
  credits?: string
}

export type MediaAsset = SystemFields<"mediaAssets"> & {
  cloudinaryAssetId: string
  publicId: string
  assetFolder: string
  categoryPath: string
  shootPath: string
  categoryName: string
  shootName: string
  displayName: string
  format: string
  resourceType: string
  bytes: number
  width: number | null
  height: number | null
  aspectRatio: number | null
  secureUrl: string
  thumbnailUrl: string
  previewUrl: string
  displayFolder: string
  context: Record<string, string>
  orderRank: number
  layoutColumn?: number
  layoutOrder?: number
  layoutColumnCount?: number
  homeCarouselOrderRank?: number
}

export type SiteAsset = SystemFields<"siteAssets"> & {
  key: string
  cloudinaryAssetId: string
  publicId: string
  assetFolder: string
  displayName: string
  format: string
  resourceType: string
  bytes: number
  width: number | null
  height: number | null
  aspectRatio: number | null
  secureUrl: string
  thumbnailUrl: string
  previewUrl: string
  displayFolder: string
  context: Record<string, string>
}
