import type { ConvexAssetView, LocalEnv, PricingItem } from "./part-01"
import {
  isLandscapeAssetDimensions,
  isRecord,
  normalizeEnvValue,
  withCloudinaryTransformation,
} from "./part-02"

export function getDefaultPricingItems() {
  return [] satisfies PricingItem[]
}

export type ConvexCategorySummaryView = {
  name: string
  path: string
  orderRank: number
  cover: ConvexAssetView | null
  shootCount: number
  assetCount?: number
  isDirectPhotoCategory?: boolean
}

export function parseEnvFile(contents: string): LocalEnv {
  const values: LocalEnv = {}

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)

    if (!match) {
      continue
    }

    const key = match[1]
    const value = match[2]

    if (!key || value === undefined) {
      continue
    }

    values[key] = normalizeEnvValue(value)
  }

  return values
}

export function getThumbnailUrl({
  secureUrl,
  resourceType,
  width,
  height,
  aspectRatio,
}: {
  secureUrl: string
  resourceType: string
  width?: number | null
  height?: number | null
  aspectRatio?: number | null
}) {
  if (resourceType !== "image") {
    return secureUrl
  }

  const transformation = isLandscapeAssetDimensions({
    width,
    height,
    aspectRatio,
  })
    ? "c_fill,g_auto,w_720,h_480/f_auto/q_auto"
    : "c_fill,g_auto,w_640,h_800/f_auto/q_auto"

  return withCloudinaryTransformation(secureUrl, transformation)
}

export function getThumbnailSrcSet({
  secureUrl,
  resourceType,
  width,
  height,
  aspectRatio,
}: {
  secureUrl: string
  resourceType: string
  width?: number | null
  height?: number | null
  aspectRatio?: number | null
}) {
  if (resourceType !== "image") {
    return undefined
  }

  const thumbnailWidths = isLandscapeAssetDimensions({
    width,
    height,
    aspectRatio,
  })
    ? [
        { width: 360, height: 240 },
        { width: 540, height: 360 },
        { width: 720, height: 480 },
        { width: 960, height: 640 },
      ]
    : [
        { width: 320, height: 400 },
        { width: 480, height: 600 },
        { width: 640, height: 800 },
        { width: 800, height: 1000 },
      ]

  return thumbnailWidths
    .map(
      (thumbnail) =>
        `${withCloudinaryTransformation(
          secureUrl,
          `c_fill,g_auto,w_${thumbnail.width},h_${thumbnail.height}/f_auto/q_auto`
        )} ${thumbnail.width}w`
    )
    .join(", ")
}

export function readString(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined
  }

  const property = Reflect.get(value, key)

  return typeof property === "string" ? property : undefined
}

export function readNumber(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined
  }

  const property = Reflect.get(value, key)

  return typeof property === "number" ? property : undefined
}

export function readObject(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined
  }

  const property = Reflect.get(value, key)

  return isRecord(property) ? property : undefined
}

export function readArray(value: unknown, key: string) {
  if (!isRecord(value)) {
    return []
  }

  const property = Reflect.get(value, key)

  return Array.isArray(property) ? property : []
}

export function getCloudinaryAdminApiErrorMessage(responseBody: string) {
  try {
    const parsed = JSON.parse(responseBody)

    if (isRecord(parsed)) {
      const error = Reflect.get(parsed, "error")

      if (isRecord(error)) {
        const message = Reflect.get(error, "message")

        if (typeof message === "string" && message.trim()) {
          return message.trim()
        }
      }
    }
  } catch {
    // Fall through to the raw response body.
  }

  return responseBody.trim().slice(0, 300) || "Unknown Cloudinary error"
}
