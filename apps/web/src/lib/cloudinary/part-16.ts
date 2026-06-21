import { mediaRouteSegmentMatchesName } from "@/lib/media-route-segment"

import { CLOUDINARY_ROOT_FOLDER, type CloudinaryReadOptions } from "./part-01"
import { getCloudinaryErrorMessage } from "./part-05"
import type { CloudinaryConnection } from "./part-07"
import {
  buildCategoryFolderPath,
  buildShootFolderPathForCategoryPath,
} from "./part-08"
import {
  buildShootFolderPath,
  getCloudinaryConfigState,
  getConvexMediaClient,
} from "./part-09"
import type { CloudinaryAbout, CloudinaryPricing } from "./part-10"
import { searchAssetsInFolders } from "./part-11"
import { readAboutContent, readAboutImage, readPricingItems } from "./part-12"
import {
  configureCloudinary,
  hasCachedCategoryData,
  hasCachedShootData,
  readConvexCategoryNavigation,
  readSyncedCategory,
  readSyncedHome,
} from "./part-13"
import { readSyncedShoot } from "./part-14"

export async function getCloudinaryAbout(): Promise<CloudinaryAbout> {
  const connectionState = getCloudinaryConfigState()
  const [categories, content, cachedImage] = await Promise.all([
    readConvexCategoryNavigation(),
    readAboutContent(),
    readAboutImage(),
  ])

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories,
      image: cachedImage || undefined,
      content,
    } satisfies CloudinaryAbout
  }

  if (cachedImage) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories,
      image: cachedImage,
      content,
    } satisfies CloudinaryAbout
  }

  try {
    configureCloudinary()

    const rootAssets = await searchAssetsInFolders({
      folderPaths: [CLOUDINARY_ROOT_FOLDER],
      imageOnly: true,
      maxResults: 1,
    })

    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories,
      image: rootAssets[0],
      content,
    } satisfies CloudinaryAbout
  } catch (error) {
    return {
      connection: {
        ...connectionState,
        error: getCloudinaryErrorMessage(error),
      },
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories,
      content,
    } satisfies CloudinaryAbout
  }
}

export async function getCloudinaryPricing(): Promise<CloudinaryPricing> {
  const connectionState = getCloudinaryConfigState()
  const [categories, items] = await Promise.all([
    readConvexCategoryNavigation(),
    readPricingItems(),
  ])

  return {
    connection: connectionState,
    rootFolder: CLOUDINARY_ROOT_FOLDER,
    categories,
    items,
  } satisfies CloudinaryPricing
}

export async function tryReadCachedCategory({
  categoryName,
  connection,
  options,
}: {
  categoryName: string
  connection: CloudinaryConnection
  options: CloudinaryReadOptions
}) {
  if (options.refresh) {
    return null
  }

  const client = getConvexMediaClient()

  if (!client) {
    return null
  }

  try {
    const home = await readSyncedHome({ client, connection })
    const cachedCategory = home.categories.find((category) =>
      mediaRouteSegmentMatchesName(categoryName, category.name)
    )
    const categoryPath =
      cachedCategory?.path || buildCategoryFolderPath(categoryName)
    const categoryPage = await readSyncedCategory({
      client,
      connection,
      categoryPath,
    })

    return hasCachedCategoryData(categoryPage) ? categoryPage : null
  } catch {
    return null
  }
}

export async function tryReadCachedShoot({
  categoryName,
  connection,
  options,
  shootName,
}: {
  categoryName: string
  connection: CloudinaryConnection
  options: CloudinaryReadOptions
  shootName: string
}) {
  if (options.refresh) {
    return null
  }

  const client = getConvexMediaClient()

  if (!client) {
    return null
  }

  try {
    const home = await readSyncedHome({ client, connection })
    const cachedCategory = home.categories.find((category) =>
      mediaRouteSegmentMatchesName(categoryName, category.name)
    )
    const categoryPath =
      cachedCategory?.path || buildCategoryFolderPath(categoryName)
    const categoryPage = await readSyncedCategory({
      client,
      connection,
      categoryPath,
    })
    const cachedShoot = categoryPage.shoots.find((shoot) =>
      mediaRouteSegmentMatchesName(shootName, shoot.name)
    )
    const shootPath =
      cachedShoot?.path ||
      (categoryPage.category
        ? buildShootFolderPathForCategoryPath(
            categoryPage.category.path,
            shootName
          )
        : buildShootFolderPath(categoryName, shootName))
    const shootPage = await readSyncedShoot({
      client,
      connection,
      categoryPath,
      shootPath,
    })

    return hasCachedShootData(shootPage) ? shootPage : null
  } catch {
    return null
  }
}
