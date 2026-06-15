import type { CloudinaryAsset } from "@/lib/cloudinary.server"

import { SITE_URL } from "./constants"

type JsonLdObject = Record<string, unknown>

function getAssetSeoImage(asset: CloudinaryAsset | null | undefined) {
  return asset?.previewUrl || asset?.secureUrl || asset?.thumbnailUrl
}

function getNumericPrice(value: string) {
  const match = value.replace(",", ".").match(/\d+(?:\.\d+)?/)

  return match?.[0]
}

function getAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`

  return `${SITE_URL}${path}`
}

function humanizeRouteSegment(value: string) {
  const decoded = decodeURIComponentSafe(value)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return decoded
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function serializeJsonLd(value: JsonLdObject) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029")
}

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export {
  escapeXml,
  getAbsoluteUrl,
  getAssetSeoImage,
  getNumericPrice,
  humanizeRouteSegment,
  serializeJsonLd,
}
export type { JsonLdObject }
