import type { CloudinaryAsset, CloudinaryFolder } from "@/lib/cloudinary.server"

const preloadedViewerImageUrls = new Set<string>()
const loadedViewerImageUrls = new Set<string>()

function getEffectiveCoverAssetId(
  shoot: CloudinaryFolder,
  assets: CloudinaryAsset[]
) {
  if (
    shoot.coverAssetId &&
    assets.some((asset) => asset.assetId === shoot.coverAssetId)
  ) {
    return shoot.coverAssetId
  }

  return assets[0]?.assetId
}

function getInlineCreditText(credits: string) {
  return credits.trim().replace(/\s+/g, " ")
}

function getCircularAsset(
  assets: CloudinaryAsset[],
  currentAssetId: string,
  direction: -1 | 1
) {
  const currentIndex = assets.findIndex(
    (asset) => asset.assetId === currentAssetId
  )

  if (currentIndex === -1 || assets.length === 0) {
    return undefined
  }

  const nextIndex = (currentIndex + direction + assets.length) % assets.length

  return assets[nextIndex]
}

function preloadViewerAssetsAround(
  assets: CloudinaryAsset[],
  currentAssetId: string
) {
  const currentAsset = assets.find((asset) => asset.assetId === currentAssetId)

  preloadViewerAsset(currentAsset)
  preloadViewerAsset(getCircularAsset(assets, currentAssetId, -1))
  preloadViewerAsset(getCircularAsset(assets, currentAssetId, 1))
}

function preloadViewerAsset(asset: CloudinaryAsset | undefined) {
  if (typeof window === "undefined" || !asset) {
    return
  }

  const imageUrl = getViewerImageUrl(asset)

  if (!imageUrl || preloadedViewerImageUrls.has(imageUrl)) {
    return
  }

  preloadedViewerImageUrls.add(imageUrl)

  const image = new Image()

  image.decoding = "async"
  image.addEventListener("load", () => loadedViewerImageUrls.add(imageUrl), {
    once: true,
  })
  image.addEventListener(
    "error",
    () => preloadedViewerImageUrls.delete(imageUrl),
    { once: true }
  )
  image.src = imageUrl
}

function isViewerImageLoaded(imageUrl: string | undefined) {
  return imageUrl ? loadedViewerImageUrls.has(imageUrl) : false
}

function markViewerImageLoaded(imageUrl: string) {
  loadedViewerImageUrls.add(imageUrl)
}

function getViewerImageUrl(asset: CloudinaryAsset) {
  return asset.previewUrl || asset.secureUrl
}

function getAssetTypeLabel(asset: CloudinaryAsset) {
  return (asset.format || asset.resourceType || "file").toUpperCase()
}

function getAssetDimensionLabel(asset: CloudinaryAsset) {
  if (asset.width && asset.height) {
    return `${asset.width}x${asset.height}`
  }

  return "No size"
}

function getAssetFrameClass(asset: CloudinaryAsset) {
  return isLandscapeAsset(asset) ? "aspect-[3/2]" : "aspect-[4/5]"
}

function isLandscapeAsset(asset: CloudinaryAsset) {
  if (asset.aspectRatio) {
    return asset.aspectRatio > 1
  }

  return Boolean(asset.width && asset.height && asset.width > asset.height)
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong."
}

export {
  getAssetDimensionLabel,
  getAssetFrameClass,
  getAssetTypeLabel,
  getCircularAsset,
  getEffectiveCoverAssetId,
  getErrorMessage,
  getInlineCreditText,
  getViewerImageUrl,
  isViewerImageLoaded,
  markViewerImageLoaded,
  preloadViewerAssetsAround,
}
