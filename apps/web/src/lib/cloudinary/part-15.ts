import { api } from "@workspace/backend/api"

import {
  type AboutContentBlock,
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryAssetLayout,
  type CloudinaryReadOptions,
  type PricingItem,
} from "./part-01"
import { normalizeDollaFolderPath } from "./part-05"
import { deleteCloudinaryAssets } from "./part-06"
import {
  type CloudinaryConnection,
  getPricingContentBlocks,
  isMissingCloudinaryFolderError,
} from "./part-07"
import { getConvexMediaClient } from "./part-09"
import { hasCachedHomeData } from "./part-10"
import { searchAssetsInFolders } from "./part-11"
import {
  getActiveConvexShootFolder,
  getRequiredConvexMediaClient,
  readAboutImage,
  resolveDirectPhotoCategoryShootPath,
} from "./part-12"
import { deleteEmptyCloudinaryFolder, readSyncedHome } from "./part-13"

export async function setCloudinaryShootCredits({
  shootPath,
  credits,
}: {
  shootPath: string
  credits: string
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setShootCredits, {
    shootPath: normalizeDollaFolderPath(shootPath),
    credits,
  })

  return null
}

export async function setCloudinaryCategoryDescription({
  categoryPath,
  description,
}: {
  categoryPath: string
  description: string
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setCategoryDescription, {
    categoryPath: normalizeDollaFolderPath(categoryPath),
    description,
  })

  return null
}

export async function setCloudinaryAboutContent({
  blocks,
}: {
  blocks: AboutContentBlock[]
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setSiteContent, {
    key: "about",
    blocks,
  })

  return null
}

export async function setCloudinaryPricingItems({
  items,
}: {
  items: PricingItem[]
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setSiteContent, {
    key: "pricing",
    blocks: getPricingContentBlocks(items),
  })

  return null
}

export async function setCloudinaryCategoryCover({
  categoryPath,
  shootPath,
}: {
  categoryPath: string
  shootPath: string
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setCategoryCoverShoot, {
    categoryPath: normalizeDollaFolderPath(categoryPath),
    shootPath: normalizeDollaFolderPath(shootPath),
  })

  return null
}

export async function getCurrentCloudinaryAboutImage() {
  const cachedImage = await readAboutImage()

  if (cachedImage) {
    return cachedImage
  }

  const rootAssets = await searchAssetsInFolders({
    folderPaths: [CLOUDINARY_ROOT_FOLDER],
    imageOnly: true,
    maxResults: 1,
  })

  return rootAssets[0]
}

export async function isActiveConvexShootFolder(folderPath: string) {
  return Boolean(await getActiveConvexShootFolder(undefined, folderPath))
}

export async function reorderCloudinaryAssets({
  shootPath,
  assetIds,
}: {
  shootPath: string
  assetIds: string[]
  assetLayouts?: CloudinaryAssetLayout[]
}) {
  const client = getRequiredConvexMediaClient()
  const normalizedShootPath = await resolveDirectPhotoCategoryShootPath(
    normalizeDollaFolderPath(shootPath)
  )

  await client.mutation(api.media.reorderAssets, {
    shootPath: normalizedShootPath,
    assetIds,
  })

  return null
}

export async function deleteCloudinaryShootFolder(folderPath: string) {
  const assets = await searchAssetsInFolders({
    folderPaths: [folderPath],
    imageOnly: false,
  })

  await deleteCloudinaryAssets(assets)

  try {
    await deleteEmptyCloudinaryFolder(folderPath)
  } catch (error) {
    if (!isMissingCloudinaryFolderError(error)) {
      throw error
    }
  }
}

export async function tryReadCachedHome({
  connection,
  options,
}: {
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

    return hasCachedHomeData(home) ? home : null
  } catch {
    return null
  }
}
