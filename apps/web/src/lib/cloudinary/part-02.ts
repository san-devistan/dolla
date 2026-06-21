import path from "node:path"

export function getLocalEnvFiles() {
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, ".env"),
    path.join(cwd, ".env.local"),
    path.join(cwd, "apps/web/.env"),
    path.join(cwd, "apps/web/.env.local"),
    path.join(cwd, "packages/backend/.env"),
    path.join(cwd, "packages/backend/.env.local"),
    path.resolve(cwd, "../..", ".env"),
    path.resolve(cwd, "../..", ".env.local"),
    path.resolve(cwd, "../..", "apps/web/.env"),
    path.resolve(cwd, "../..", "apps/web/.env.local"),
    path.resolve(cwd, "../..", "packages/backend/.env"),
    path.resolve(cwd, "../..", "packages/backend/.env.local"),
  ]

  return Array.from(new Set(candidates))
}

export function normalizeEnvValue(rawValue: string) {
  const value = rawValue.trim()
  const quote = value[0]

  if (
    (quote === `"` || quote === `'`) &&
    value.length >= 2 &&
    value.endsWith(quote)
  ) {
    return value.slice(1, -1)
  }

  const commentIndex = value.search(/\s#/)

  if (commentIndex === -1) {
    return value
  }

  return value.slice(0, commentIndex).trim()
}

export function isLandscapeAssetDimensions({
  width,
  height,
  aspectRatio,
}: {
  width?: number | null
  height?: number | null
  aspectRatio?: number | null
}) {
  if (aspectRatio) {
    return aspectRatio > 1
  }

  return Boolean(width && height && width > height)
}

export function withCloudinaryTransformation(
  url: string,
  transformation: string
) {
  const uploadMarker = "/upload/"
  const uploadIndex = url.indexOf(uploadMarker)

  if (uploadIndex === -1) {
    return url
  }

  return `${url.slice(0, uploadIndex + uploadMarker.length)}${transformation}/${url.slice(
    uploadIndex + uploadMarker.length
  )}`
}

export function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null
}

export function getPricingItemId(index: number, name: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item"

  return `pricing-${index}-${slug}`
}

export function parseCloudinaryUrl(value: string) {
  try {
    const parsedUrl = new URL(value)

    if (
      parsedUrl.protocol !== "cloudinary:" ||
      !parsedUrl.hostname ||
      !parsedUrl.username ||
      !parsedUrl.password
    ) {
      return null
    }

    return parsedUrl
  } catch {
    return null
  }
}

export function decodeFolderRouteParam(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function namesMatch(first: string, second: string) {
  return first.localeCompare(second, undefined, { sensitivity: "base" }) === 0
}

export function isSameOrChildFolder(folderPath: string, parentPath: string) {
  return folderPath === parentPath || folderPath.startsWith(`${parentPath}/`)
}

export function normalizeContext(context: object | undefined) {
  if (!context) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, String(value)])
  )
}

export function escapeSearchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
}

export function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

export function isCloudinaryAssetId(value: string) {
  return /^[a-f0-9]{32}$/i.test(value)
}

export function getUnknownErrorMessage(error: unknown): string | null {
  if (typeof error === "string") {
    return error
  }

  if (!error || typeof error !== "object") {
    return null
  }

  const message = Reflect.get(error, "message")

  if (typeof message === "string" && message) {
    return message
  }

  const nestedError = Reflect.get(error, "error")

  if (typeof nestedError === "string" && nestedError) {
    return nestedError
  }

  if (nestedError && typeof nestedError === "object") {
    const nestedMessage = Reflect.get(nestedError, "message")

    if (typeof nestedMessage === "string" && nestedMessage) {
      return nestedMessage
    }
  }

  return null
}
