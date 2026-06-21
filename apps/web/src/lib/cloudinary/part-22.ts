import { isDirectPhotoCategoryPath } from "@/lib/direct-photo-category"

import { CLOUDINARY_ROOT_FOLDER } from "./part-01"
import { normalizeDollaFolderPath } from "./part-05"
import { deleteCloudinaryAssets } from "./part-06"
import { getFolderInfo } from "./part-07"
import { getConvexMediaClient } from "./part-09"
import { searchAssetsInFolders } from "./part-11"
import { resolveDirectPhotoCategoryShootPath } from "./part-12"
import { configureCloudinary } from "./part-13"
import { syncCloudinaryMetadata } from "./part-14"
import { isActiveConvexShootFolder } from "./part-15"
import { getCloudinaryLibrary } from "./part-19"

export async function deleteCloudinaryShootAssets({
  assetIds,
  selectedFolder,
  shootPath,
}: {
  assetIds: string[]
  selectedFolder: string
  shootPath: string
}) {
  configureCloudinary()

  const normalizedShootPath = await resolveDirectPhotoCategoryShootPath(
    normalizeDollaFolderPath(shootPath)
  )
  const folderInfo = getFolderInfo(normalizedShootPath)
  const isRootShootFolder =
    folderInfo.kind === "category" &&
    !isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER) &&
    (await isActiveConvexShootFolder(normalizedShootPath))
  const selectedAssetIds = Array.from(
    new Set(
      assetIds.flatMap((assetId) => {
        const trimmedAssetId = assetId.trim()

        return trimmedAssetId ? [trimmedAssetId] : []
      })
    )
  )

  if (
    folderInfo.kind !== "shoot" &&
    !isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER) &&
    !isRootShootFolder
  ) {
    throw new Error(
      "Photos can only be deleted from a shoot folder or Mariage."
    )
  }

  if (selectedAssetIds.length === 0) {
    throw new Error("Select at least one photo to delete.")
  }

  const shootAssets = await searchAssetsInFolders({
    folderPaths: [normalizedShootPath],
    imageOnly: false,
    maxResults: 500,
  })
  const selectedAssetIdSet = new Set(selectedAssetIds)
  const assetsToDelete = shootAssets.filter((asset) =>
    selectedAssetIdSet.has(asset.assetId)
  )

  if (assetsToDelete.length !== selectedAssetIds.length) {
    throw new Error("Some selected photos could not be found in this shoot.")
  }

  await deleteCloudinaryAssets(assetsToDelete)

  const convexClient = getConvexMediaClient()

  if (convexClient) {
    const remainingAssets = await searchAssetsInFolders({
      folderPaths: [normalizedShootPath],
      imageOnly: true,
      maxResults: 500,
    })

    await syncCloudinaryMetadata({
      client: convexClient,
      folders: [],
      assets: remainingAssets,
      markMissingFolders: false,
      assetFolderPaths: [normalizedShootPath],
    })
  }

  return getCloudinaryLibrary(selectedFolder)
}
