import { mediaRouteSegmentMatchesName } from "@/lib/media-route-segment"

const DIRECT_PHOTO_CATEGORY_NAME = "Mariage"

function getDirectPhotoCategoryPath(rootFolder: string) {
  return `${rootFolder}/${DIRECT_PHOTO_CATEGORY_NAME}`
}

function isDirectPhotoCategoryName(value: string | null | undefined) {
  return Boolean(
    value && mediaRouteSegmentMatchesName(value, DIRECT_PHOTO_CATEGORY_NAME)
  )
}

function isDirectPhotoCategoryPath(
  folderPath: string | null | undefined,
  rootFolder: string
) {
  if (!folderPath) {
    return false
  }

  const segments = folderPath.split("/")

  return (
    segments.length === 2 &&
    segments[0] === rootFolder &&
    isDirectPhotoCategoryName(segments[1])
  )
}

export {
  DIRECT_PHOTO_CATEGORY_NAME,
  getDirectPhotoCategoryPath,
  isDirectPhotoCategoryName,
  isDirectPhotoCategoryPath,
}
