import type { v2 as cloudinary } from "cloudinary"
import type { ConvexHttpClient } from "convex/browser"

export const CLOUDINARY_ROOT_FOLDER = "Dolla"

export const ABOUT_IMAGE_SITE_ASSET_KEY = "aboutImage"

export const ABOUT_IMAGE_PUBLIC_ID = "dolla-about"

export const FORBIDDEN_FOLDER_CHARS = /[?&#\\%<>+]/

export const SHOOT_FOLDER_KEY_PREFIX = "s_"

export const DELETE_ASSET_BATCH_SIZE = 100

export const HOME_LATEST_ASSET_LIMIT = 42

export type LocalEnv = Record<string, string>

export type CloudinaryUploadResult = {
  asset_id?: string
  public_id?: string
  asset_folder?: string
  display_name?: string
  filename?: string
  format?: string
  resource_type?: string
  bytes?: number
  width?: number
  height?: number
  aspect_ratio?: number
  secure_url?: string
  context?: object
}

export type CloudinaryDirectUploadSignature = {
  cloudName: string
  apiKey: string
  uploadUrl: string
  fields: Record<string, string>
}

export type CloudinarySearchBuilder = typeof cloudinary.search

export type CloudinaryRawFolder = {
  name?: string
  path?: string
}

export type CloudinaryAdminCredentials = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

export type CloudinaryFolderKind = "root" | "category" | "shoot" | "nested"

export type CloudinaryAsset = {
  assetId: string
  publicId: string
  folder: string
  displayName: string
  format: string
  resourceType: string
  bytes: number
  width?: number
  height?: number
  aspectRatio?: number
  secureUrl: string
  thumbnailUrl: string
  thumbnailSrcSet?: string
  previewUrl: string
  displayFolder: string
  categoryName?: string
  shootName?: string
  context: Record<string, string>
  orderRank?: number
  layoutColumn?: number
  layoutOrder?: number
  layoutColumnCount?: number
  homeCarouselOrderRank?: number
}

export type CloudinaryAssetLayout = {
  assetId: string
  layoutColumn: number
  layoutOrder: number
  layoutColumnCount: number
}

export type AboutContentBlock = {
  id: string
  kind: "paragraph" | "heading"
  text: string
  bold: boolean
}

export type PricingItem = {
  id: string
  name: string
  description: string
  price: string
}

export type ConvexMediaClient = ConvexHttpClient

export type ConvexAssetView = {
  assetId: string
  publicId: string
  folder: string
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
  categoryName: string | null
  shootName: string | null
  context: Record<string, string>
  orderRank: number
  layoutColumn: number | null
  layoutOrder: number | null
  layoutColumnCount: number | null
  homeCarouselOrderRank: number | null
}

export type ConvexSiteAssetView = {
  key: string
  assetId: string
  publicId: string
  folder: string
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

export type CloudinaryReadOptions = {
  refresh?: boolean
}

export type CloudinaryFolderSearchOptions = {
  knownFolderPaths?: string[]
}

export class CloudinaryConfigError extends Error {
  constructor(readonly missingKeys: string[]) {
    super(`Missing Cloudinary environment values: ${missingKeys.join(", ")}`)
    this.name = "CloudinaryConfigError"
  }
}
