import { api } from "@workspace/backend/api"
import { v2 as cloudinary } from "cloudinary"
import { Buffer } from "node:buffer"

import {
  CLOUDINARY_ROOT_FOLDER,
  CloudinaryConfigError,
  type CloudinaryDirectUploadSignature,
  type ConvexMediaClient,
} from "./part-01"
import { parseCloudinaryUrl } from "./part-02"
import { getCloudinaryAdminApiErrorMessage } from "./part-04"
import { mapConvexAsset, mapConvexFolder } from "./part-06"
import type { CloudinaryConnection } from "./part-07"
import { type CloudinaryHome, readServerEnv } from "./part-08"
import { getCloudinaryConfigState, getConvexMediaClient } from "./part-09"
import {
  type CloudinaryCategoryPage,
  type CloudinaryShootPage,
  getCloudinaryAdminCredentials,
  mapConvexCategorySummary,
} from "./part-10"

export function configureCloudinary() {
  const cloudinaryUrl = readServerEnv("CLOUDINARY_URL")

  if (cloudinaryUrl) {
    const parsedUrl = parseCloudinaryUrl(cloudinaryUrl)

    if (!parsedUrl) {
      throw new Error(
        "CLOUDINARY_URL must use cloudinary://<api-key>:<api-secret>@<cloud-name>."
      )
    }

    cloudinary.config({
      cloud_name: parsedUrl.hostname,
      api_key: decodeURIComponent(parsedUrl.username),
      api_secret: decodeURIComponent(parsedUrl.password),
      secure: true,
    })

    return getCloudinaryConfigState()
  }

  const state = getCloudinaryConfigState()

  if (!state.configured) {
    throw new CloudinaryConfigError(state.missingKeys)
  }

  cloudinary.config({
    cloud_name: state.cloudName,
    api_key: readServerEnv("CLOUDINARY_API_KEY"),
    api_secret: readServerEnv("CLOUDINARY_API_SECRET"),
    secure: true,
  })

  return state
}

export async function deleteEmptyCloudinaryFolder(folderPath: string) {
  const credentials = getCloudinaryAdminCredentials()
  const encodedFolderPath = encodeURIComponent(folderPath)
  const endpoint = new URL(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/folders/${encodedFolderPath}`
  )
  const authorization = Buffer.from(
    `${credentials.apiKey}:${credentials.apiSecret}`
  ).toString("base64")

  endpoint.searchParams.set("skip_backup", "true")

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${authorization}`,
    },
  })

  if (response.ok) {
    return
  }

  const responseBody = await response.text()
  const message = getCloudinaryAdminApiErrorMessage(responseBody)

  throw new Error(
    `Cloudinary folder deletion failed (${response.status}): ${message}`
  )
}

export function signCloudinaryUploadParams(
  params: Record<string, string>
): CloudinaryDirectUploadSignature {
  const credentials = getCloudinaryAdminCredentials()
  const signature = cloudinary.utils.api_sign_request(
    params,
    credentials.apiSecret
  )

  return {
    cloudName: credentials.cloudName,
    apiKey: credentials.apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`,
    fields: {
      ...params,
      signature,
    },
  }
}

export function hasCachedCategoryData(categoryPage: CloudinaryCategoryPage) {
  return (
    Boolean(categoryPage.category) ||
    categoryPage.categories.length > 0 ||
    categoryPage.shoots.length > 0 ||
    categoryPage.assets.length > 0
  )
}

export function hasCachedShootData(shootPage: CloudinaryShootPage) {
  return (
    Boolean(shootPage.category) ||
    Boolean(shootPage.shoot) ||
    shootPage.categories.length > 0 ||
    shootPage.assets.length > 0
  )
}

export async function readSyncedHome({
  client,
  connection,
}: {
  client: ConvexMediaClient
  connection: CloudinaryConnection
}): Promise<CloudinaryHome> {
  const home = await client.query(api.media.getHome, {})

  return {
    connection,
    rootFolder: CLOUDINARY_ROOT_FOLDER,
    categories: home.categories.map(mapConvexCategorySummary),
    heroAssets: home.heroAssets.map(mapConvexAsset),
    latestAssets: home.latestAssets.map(mapConvexAsset),
  }
}

export async function readConvexCategoryNavigation(): Promise<
  CloudinaryHome["categories"]
> {
  const client = getConvexMediaClient()

  if (!client) {
    return []
  }

  try {
    const home = await client.query(api.media.getHome, {})

    return home.categories.map(mapConvexCategorySummary)
  } catch {
    return []
  }
}

export async function readSyncedCategory({
  client,
  connection,
  categoryPath,
}: {
  client: ConvexMediaClient
  connection: CloudinaryConnection
  categoryPath: string
}): Promise<CloudinaryCategoryPage> {
  const categoryPage = await client.query(api.media.getCategory, {
    categoryPath,
  })

  return {
    connection,
    rootFolder: CLOUDINARY_ROOT_FOLDER,
    category: categoryPage.category
      ? mapConvexFolder(categoryPage.category)
      : null,
    categories: categoryPage.categories.map(mapConvexCategorySummary),
    shoots: categoryPage.shoots.map((shoot) => ({
      name: shoot.name,
      path: shoot.path,
      categoryName: shoot.categoryName,
      cover: shoot.cover ? mapConvexAsset(shoot.cover) : null,
      assetCount: shoot.assetCount,
    })),
    assets: categoryPage.assets.map(mapConvexAsset),
  }
}
