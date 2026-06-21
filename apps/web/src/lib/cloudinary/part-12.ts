import { isDirectPhotoCategoryPath } from "@/lib/direct-photo-category"
import { api } from "@workspace/backend/api"

import {
  ABOUT_IMAGE_SITE_ASSET_KEY,
  CLOUDINARY_ROOT_FOLDER,
  type ConvexMediaClient,
} from "./part-01"
import type { CloudinaryFolder } from "./part-03"
import { getDefaultPricingItems } from "./part-04"
import {
  findCategoryFolderByRouteSegment,
  findShootFolderByRouteSegment,
  normalizeDollaFolderPath,
} from "./part-05"
import { getDefaultAboutContent } from "./part-06"
import { mapConvexSiteAsset, parsePricingItemBlock } from "./part-07"
import {
  buildCategoryFolderPath,
  buildShootFolderPathForCategoryPath,
} from "./part-08"
import {
  buildShootFolderPath,
  createRootShootCloudinaryFolderAttempt,
  getConvexMediaClient,
} from "./part-09"

export function getShootSelection({
  categoryName,
  folders,
  shootName,
}: {
  categoryName: string
  folders: CloudinaryFolder[]
  shootName: string
}) {
  const category = findCategoryFolderByRouteSegment(folders, categoryName)
  const categoryPath = category?.path || buildCategoryFolderPath(categoryName)
  const shoot = category
    ? findShootFolderByRouteSegment({
        category,
        folders,
        shootRouteSegment: shootName,
      })
    : undefined
  const shootPath =
    shoot?.path ||
    (category
      ? buildShootFolderPathForCategoryPath(category.path, shootName)
      : buildShootFolderPath(categoryName, shootName))

  return { category, categoryPath, shoot, shootPath }
}

export async function createRootShootCloudinaryFolder(
  activeFolderPaths: Set<string>
) {
  return createRootShootCloudinaryFolderAttempt(activeFolderPaths, 0)
}

export function getRequiredConvexMediaClient(): ConvexMediaClient {
  const client = getConvexMediaClient()

  if (!client) {
    throw new Error(
      "CONVEX_URL or VITE_CONVEX_URL is required for media metadata changes."
    )
  }

  return client
}

export async function readAboutContent() {
  const client = getConvexMediaClient()

  if (!client) {
    return getDefaultAboutContent()
  }

  try {
    const content = await client.query(api.media.getSiteContent, {
      key: "about",
    })

    return content?.blocks ?? getDefaultAboutContent()
  } catch {
    return getDefaultAboutContent()
  }
}

export async function readAboutImage() {
  const client = getConvexMediaClient()

  if (!client) {
    return null
  }

  try {
    const asset = await client.query(api.media.getSiteAsset, {
      key: ABOUT_IMAGE_SITE_ASSET_KEY,
    })

    return asset ? mapConvexSiteAsset(asset) : null
  } catch {
    return null
  }
}

export async function readPricingItems() {
  const client = getConvexMediaClient()

  if (!client) {
    return getDefaultPricingItems()
  }

  try {
    const content = await client.query(api.media.getSiteContent, {
      key: "pricing",
    })

    return content?.blocks.flatMap(parsePricingItemBlock) ?? []
  } catch {
    return getDefaultPricingItems()
  }
}

export async function getActiveConvexShootFolder(
  client: ConvexMediaClient | undefined,
  folderPath: string
) {
  const mediaClient = client || getConvexMediaClient()

  if (!mediaClient) {
    return null
  }

  const normalizedPath = normalizeDollaFolderPath(folderPath)
  const library = await mediaClient.query(api.media.getLibrary, {
    folderPath: normalizedPath,
  })

  return (
    library.folders.find(
      (folder) => folder.kind === "shoot" && folder.path === normalizedPath
    ) || null
  )
}

export async function resolveDirectPhotoCategoryShootPath(folderPath: string) {
  const normalizedPath = normalizeDollaFolderPath(folderPath)

  if (!isDirectPhotoCategoryPath(normalizedPath, CLOUDINARY_ROOT_FOLDER)) {
    return normalizedPath
  }

  const client = getConvexMediaClient()

  if (!client) {
    return normalizedPath
  }

  try {
    const categoryPage = await client.query(api.media.getCategory, {
      categoryPath: normalizedPath,
    })

    return categoryPage.category?.coverShootPath || normalizedPath
  } catch {
    return normalizedPath
  }
}
