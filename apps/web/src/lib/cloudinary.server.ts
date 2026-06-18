import {
  DIRECT_PHOTO_CATEGORY_NAME,
  getDirectPhotoCategoryPath,
  isDirectPhotoCategoryPath,
} from "@/lib/direct-photo-category"
import { mediaRouteSegmentMatchesName } from "@/lib/media-route-segment"
import { api } from "@workspace/backend/api"
import { v2 as cloudinary } from "cloudinary"
import { ConvexHttpClient } from "convex/browser"
import { Buffer } from "node:buffer"
import { randomUUID } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const CLOUDINARY_ROOT_FOLDER = "Dolla"
const ABOUT_IMAGE_SITE_ASSET_KEY = "aboutImage"
const ABOUT_IMAGE_PUBLIC_ID = "dolla-about"
const FORBIDDEN_FOLDER_CHARS = /[?&#\\%<>+]/
const SHOOT_FOLDER_KEY_PREFIX = "s_"
const DELETE_ASSET_BATCH_SIZE = 100
const HOME_LATEST_ASSET_LIMIT = 42

type LocalEnv = Record<string, string>

type CloudinaryUploadResult = {
  asset_id?: string
  public_id?: string
  asset_folder?: string
  display_name?: string
  filename?: string
  format?: string
  resource_type?: string
  bytes?: number
  width?: number
  height?: number
  aspect_ratio?: number
  secure_url?: string
  context?: object
}

type CloudinaryDirectUploadSignature = {
  cloudName: string
  apiKey: string
  uploadUrl: string
  fields: Record<string, string>
}

type CloudinarySearchBuilder = typeof cloudinary.search

type CloudinaryRawFolder = {
  name?: string
  path?: string
}

type CloudinaryConfiguredState = {
  configured: true
  cloudName: string
  missingKeys: []
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
}

type CloudinaryMissingState = {
  configured: false
  cloudName?: string
  missingKeys: string[]
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
}

type CloudinaryConnectionState =
  | CloudinaryConfiguredState
  | CloudinaryMissingState

type CloudinaryConnection = CloudinaryConnectionState & {
  error?: string
}

type CloudinaryAdminCredentials = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

type CloudinaryFolderKind = "root" | "category" | "shoot" | "nested"

type CloudinaryFolder = {
  name: string
  path: string
  displayPath: string
  kind: CloudinaryFolderKind
  depth: number
  parentPath: string | null
  categoryName?: string
  shootName?: string
  orderRank?: number
  coverShootPath?: string
  coverAssetId?: string
  description?: string
  credits?: string
}

type CloudinaryAsset = {
  assetId: string
  publicId: string
  folder: string
  displayName: string
  format: string
  resourceType: string
  bytes: number
  width?: number
  height?: number
  aspectRatio?: number
  secureUrl: string
  thumbnailUrl: string
  thumbnailSrcSet?: string
  previewUrl: string
  displayFolder: string
  categoryName?: string
  shootName?: string
  context: Record<string, string>
  orderRank?: number
  layoutColumn?: number
  layoutOrder?: number
  layoutColumnCount?: number
  homeCarouselOrderRank?: number
}

type CloudinaryAssetLayout = {
  assetId: string
  layoutColumn: number
  layoutOrder: number
  layoutColumnCount: number
}

type AboutContentBlock = {
  id: string
  kind: "paragraph" | "heading"
  text: string
  bold: boolean
}

type PricingItem = {
  id: string
  name: string
  description: string
  price: string
}

type CloudinaryLibrary = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  selectedFolder: string
  folders: CloudinaryFolder[]
  assets: CloudinaryAsset[]
  totalFolders: number
  totalAssets: number
}

type CloudinaryHome = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  categories: Array<{
    name: string
    path: string
    orderRank?: number
    cover?: CloudinaryAsset | null
    shootCount: number
    assetCount: number
    isDirectPhotoCategory: boolean
  }>
  heroAssets: CloudinaryAsset[]
  latestAssets: CloudinaryAsset[]
}

type CloudinaryShootSummary = {
  name: string
  path: string
  categoryName: string
  cover?: CloudinaryAsset | null
  assetCount: number
}

type CloudinaryCategoryPage = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  category?: CloudinaryFolder | null
  categories: CloudinaryHome["categories"]
  shoots: CloudinaryShootSummary[]
  assets: CloudinaryAsset[]
}

type CloudinaryShootPage = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  category?: CloudinaryFolder | null
  shoot?: CloudinaryFolder | null
  categories: CloudinaryHome["categories"]
  assets: CloudinaryAsset[]
}

type CloudinaryAbout = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  categories: CloudinaryHome["categories"]
  image?: CloudinaryAsset
  content: AboutContentBlock[]
}

type CloudinaryPricing = {
  connection: CloudinaryConnection
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
  categories: CloudinaryHome["categories"]
  items: PricingItem[]
}

type ConvexMediaClient = ConvexHttpClient

type ConvexFolderView = {
  name: string
  path: string
  displayPath: string
  kind: CloudinaryFolderKind
  depth: number
  parentPath: string | null
  categoryName: string | null
  shootName: string | null
  orderRank: number
  coverShootPath: string | null
  coverAssetId: string | null
  description: string | null
  credits: string | null
}

type ConvexAssetView = {
  assetId: string
  publicId: string
  folder: string
  displayName: string
  format: string
  resourceType: string
  bytes: number
  width: number | null
  height: number | null
  aspectRatio: number | null
  secureUrl: string
  thumbnailUrl: string
  previewUrl: string
  displayFolder: string
  categoryName: string | null
  shootName: string | null
  context: Record<string, string>
  orderRank: number
  layoutColumn: number | null
  layoutOrder: number | null
  layoutColumnCount: number | null
  homeCarouselOrderRank: number | null
}

type ConvexCategorySummaryView = {
  name: string
  path: string
  orderRank: number
  cover: ConvexAssetView | null
  shootCount: number
  assetCount?: number
  isDirectPhotoCategory?: boolean
}

type ConvexSiteAssetView = {
  key: string
  assetId: string
  publicId: string
  folder: string
  displayName: string
  format: string
  resourceType: string
  bytes: number
  width: number | null
  height: number | null
  aspectRatio: number | null
  secureUrl: string
  thumbnailUrl: string
  previewUrl: string
  displayFolder: string
  context: Record<string, string>
}

type CloudinaryReadOptions = {
  refresh?: boolean
}

type CloudinaryFolderSearchOptions = {
  knownFolderPaths?: string[]
}

const DEFAULT_ABOUT_CONTENT: AboutContentBlock[] = [
  {
    id: "about-title",
    kind: "heading",
    text: "A propos",
    bold: false,
  },
  {
    id: "about-intro",
    kind: "paragraph",
    text: "Moi c'est Dounia, artiste photographe passionnée basée à Paris (mais toujours partante pour traverser le monde avec mon appareil à la main).\nMa spécialité ? Le portrait, mais pas n'importe comment : j'aime imaginer des univers entiers, des décors mentaux ou oniriques où chaque personne que je photographie devient un personnage, une icône, une histoire.",
    bold: false,
  },
  {
    id: "about-approach",
    kind: "paragraph",
    text: "Mon cerveau déborde d'idées, je n'ai aucune limite créative et j'adore transformer une vision en réalité. Patiente, attentionnée et profondément investie, je mets tout mon coeur dans chaque projet ; qu'il s'agisse d'un simple portrait ou d'un shooting complet avec concept et mise en scène. Mon objectif : vous faire vous sentir vu-e-s, fort-e-s et magnifiques.",
    bold: false,
  },
  {
    id: "about-art",
    kind: "paragraph",
    text: "Ma licence d'arts à la Sorbonne m'a donné des bases solides pour nourrir ma sensibilité artistique, que je combine avec mon amour du stylisme, de la lumière, du décor et de l'imprévu.\nQue vous ayez une idée précise ou simplement une envie floue, je saurai vous accompagner avec amour, créativité et beaucoup de fun.",
    bold: false,
  },
  {
    id: "about-why-title",
    kind: "heading",
    text: "Pourquoi me choisir ?",
    bold: false,
  },
  {
    id: "about-why-body",
    kind: "paragraph",
    text: "Parce que chez moi, un shooting, c'est bien plus qu'une séance photo : c'est une expérience. Mon studio (ou tout lieu qu'on choisira ensemble) est une safe place, un espace de confiance et de bienveillance où chacun-e peut se sentir libre, respecté-e et valorisé-e.\nMon objectif ? Vous mettre à l'aise, vous chouchouter et faire ressortir le meilleur de vous-même. Peu importe qui vous êtes, comment vous vous identifiez ou ce que vous cherchez à exprimer. Vous êtes les bienvenu-e-s devant mon objectif. Mes shootings sont ouverts à tou-te-s, sans exception.",
    bold: false,
  },
  {
    id: "about-signature",
    kind: "heading",
    text: "Dolla Shashin",
    bold: true,
  },
]

let localEnvCache: LocalEnv | null = null

class CloudinaryConfigError extends Error {
  constructor(readonly missingKeys: string[]) {
    super(`Missing Cloudinary environment values: ${missingKeys.join(", ")}`)
    this.name = "CloudinaryConfigError"
  }
}

function getLocalEnv(): LocalEnv {
  if (localEnvCache) {
    return localEnvCache
  }

  localEnvCache = {}

  for (const file of getLocalEnvFiles()) {
    if (!existsSync(file)) {
      continue
    }

    Object.assign(localEnvCache, parseEnvFile(readFileSync(file, "utf8")))
  }

  return localEnvCache
}

function getLocalEnvFiles() {
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

function parseEnvFile(contents: string): LocalEnv {
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

function normalizeEnvValue(rawValue: string) {
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

function readServerEnv(name: string) {
  return process.env[name] || getLocalEnv()[name]
}

function getConvexMediaClient(): ConvexMediaClient | null {
  const convexUrl =
    readServerEnv("CONVEX_URL") || readServerEnv("VITE_CONVEX_URL")

  if (!convexUrl) {
    return null
  }

  return new ConvexHttpClient(convexUrl, { logger: false })
}

function getRequiredConvexMediaClient(): ConvexMediaClient {
  const client = getConvexMediaClient()

  if (!client) {
    throw new Error(
      "CONVEX_URL or VITE_CONVEX_URL is required for media metadata changes."
    )
  }

  return client
}

function getDefaultAboutContent() {
  return DEFAULT_ABOUT_CONTENT.map((block) => ({ ...block }))
}

function getDefaultPricingItems() {
  return [] satisfies PricingItem[]
}

async function readAboutContent() {
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

async function readAboutImage() {
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

async function readPricingItems() {
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

function parsePricingItemBlock(block: AboutContentBlock) {
  try {
    const parsed = JSON.parse(block.text)

    if (!isRecord(parsed)) {
      return []
    }

    const name = readString(parsed, "name")?.trim() ?? ""
    const description = readString(parsed, "description")?.trim() ?? ""
    const price = readString(parsed, "price")?.trim() ?? ""

    if (!name || !price) {
      return []
    }

    return [
      {
        id: block.id,
        name,
        description,
        price,
      },
    ]
  } catch {
    return []
  }
}

function getPricingContentBlocks(items: PricingItem[]) {
  return normalizePricingItems(items).map((item, index) => ({
    id: item.id || getPricingItemId(index, item.name),
    kind: "paragraph" as const,
    text: JSON.stringify({
      name: item.name,
      description: item.description,
      price: item.price,
    }),
    bold: false,
  }))
}

function normalizePricingItems(items: PricingItem[]) {
  return items.flatMap((item, index) => {
    const name = item.name.trim()
    const description = item.description.trim()
    const price = item.price.trim()

    if (!name || !price) {
      return []
    }

    return [
      {
        id: item.id.trim() || getPricingItemId(index, name),
        name,
        description,
        price,
      },
    ]
  })
}

function getPricingItemId(index: number, name: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item"

  return `pricing-${index}-${slug}`
}

function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null
}

function readString(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined
  }

  const property = Reflect.get(value, key)

  return typeof property === "string" ? property : undefined
}

function readNumber(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined
  }

  const property = Reflect.get(value, key)

  return typeof property === "number" ? property : undefined
}

function readObject(value: unknown, key: string) {
  if (!isRecord(value)) {
    return undefined
  }

  const property = Reflect.get(value, key)

  return isRecord(property) ? property : undefined
}

function readArray(value: unknown, key: string) {
  if (!isRecord(value)) {
    return []
  }

  const property = Reflect.get(value, key)

  return Array.isArray(property) ? property : []
}

function getCloudinaryConfigState(): CloudinaryConnectionState {
  const cloudinaryUrl = readServerEnv("CLOUDINARY_URL")

  if (cloudinaryUrl) {
    const parsedUrl = parseCloudinaryUrl(cloudinaryUrl)

    if (!parsedUrl) {
      return {
        configured: false,
        missingKeys: ["CLOUDINARY_URL"],
        rootFolder: CLOUDINARY_ROOT_FOLDER,
      }
    }

    const cloudName = parsedUrl.hostname

    return {
      configured: true,
      cloudName,
      missingKeys: [],
      rootFolder: CLOUDINARY_ROOT_FOLDER,
    }
  }

  const cloudName =
    readServerEnv("CLOUDINARY_CLOUD_NAME") ||
    readServerEnv("VITE_CLOUDINARY_CLOUD_NAME")
  const apiKey = readServerEnv("CLOUDINARY_API_KEY")
  const apiSecret = readServerEnv("CLOUDINARY_API_SECRET")
  const missingKeys = [
    ["CLOUDINARY_CLOUD_NAME", cloudName],
    ["CLOUDINARY_API_KEY", apiKey],
    ["CLOUDINARY_API_SECRET", apiSecret],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    return {
      configured: false,
      cloudName,
      missingKeys,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
    }
  }

  return {
    configured: true,
    cloudName,
    missingKeys: [],
    rootFolder: CLOUDINARY_ROOT_FOLDER,
  }
}

function configureCloudinary() {
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

function getCloudinaryAdminCredentials(): CloudinaryAdminCredentials {
  const cloudinaryUrl = readServerEnv("CLOUDINARY_URL")

  if (cloudinaryUrl) {
    const parsedUrl = parseCloudinaryUrl(cloudinaryUrl)

    if (!parsedUrl) {
      throw new Error(
        "CLOUDINARY_URL must use cloudinary://<api-key>:<api-secret>@<cloud-name>."
      )
    }

    return {
      cloudName: parsedUrl.hostname,
      apiKey: decodeURIComponent(parsedUrl.username),
      apiSecret: decodeURIComponent(parsedUrl.password),
    }
  }

  const cloudName =
    readServerEnv("CLOUDINARY_CLOUD_NAME") ||
    readServerEnv("VITE_CLOUDINARY_CLOUD_NAME")
  const apiKey = readServerEnv("CLOUDINARY_API_KEY")
  const apiSecret = readServerEnv("CLOUDINARY_API_SECRET")

  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryConfigError(
      [
        ["CLOUDINARY_CLOUD_NAME", cloudName],
        ["CLOUDINARY_API_KEY", apiKey],
        ["CLOUDINARY_API_SECRET", apiSecret],
      ]
        .filter(([, value]) => !value)
        .map(([key]) => key)
    )
  }

  return { cloudName, apiKey, apiSecret }
}

function parseCloudinaryUrl(value: string) {
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

function normalizeDollaFolderPath(value = CLOUDINARY_ROOT_FOLDER) {
  const normalized = value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/")
  const folderPath = normalized || CLOUDINARY_ROOT_FOLDER

  if (
    folderPath !== CLOUDINARY_ROOT_FOLDER &&
    !folderPath.startsWith(`${CLOUDINARY_ROOT_FOLDER}/`)
  ) {
    throw new Error(`Folder must be inside ${CLOUDINARY_ROOT_FOLDER}/.`)
  }

  for (const segment of folderPath.split("/")) {
    validateFolderSegment(segment)
  }

  return folderPath
}

function normalizeFolderName(value: string) {
  const name = value.trim()

  validateFolderSegment(name)

  if (name.includes("/")) {
    throw new Error("Folder names cannot contain slashes.")
  }

  return name
}

function decodeFolderRouteParam(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function buildCategoryFolderPath(categoryName: string) {
  return `${CLOUDINARY_ROOT_FOLDER}/${normalizeFolderName(
    decodeFolderRouteParam(categoryName)
  )}`
}

function buildShootFolderPath(categoryName: string, shootName: string) {
  return `${buildCategoryFolderPath(categoryName)}/${normalizeFolderName(
    decodeFolderRouteParam(shootName)
  )}`
}

function buildShootFolderPathForCategoryPath(
  categoryPath: string,
  shootName: string
) {
  return `${normalizeDollaFolderPath(categoryPath)}/${normalizeFolderName(
    decodeFolderRouteParam(shootName)
  )}`
}

function buildRootShootFolderPath(folderKey: string) {
  return `${CLOUDINARY_ROOT_FOLDER}/${normalizeFolderName(folderKey)}`
}

function createShootFolderKey() {
  return `${SHOOT_FOLDER_KEY_PREFIX}${randomUUID().replaceAll("-", "").slice(0, 12)}`
}

function namesMatch(first: string, second: string) {
  return first.localeCompare(second, undefined, { sensitivity: "base" }) === 0
}

function findCategoryFolderByRouteSegment(
  folders: CloudinaryFolder[],
  categoryRouteSegment: string
) {
  return folders.find(
    (folder) =>
      folder.kind === "category" &&
      mediaRouteSegmentMatchesName(categoryRouteSegment, folder.name)
  )
}

function findShootFolderByRouteSegment({
  category,
  folders,
  shootRouteSegment,
}: {
  category: CloudinaryFolder
  folders: CloudinaryFolder[]
  shootRouteSegment: string
}) {
  return folders.find(
    (folder) =>
      folder.kind === "shoot" &&
      folder.parentPath === category.path &&
      mediaRouteSegmentMatchesName(shootRouteSegment, folder.name)
  )
}

function getFolderInfo(value: string) {
  const folderPath = normalizeDollaFolderPath(value)
  const segments = folderPath.split("/")
  const depth = Math.max(0, segments.length - 1)
  const categoryName = segments[1]
  const shootName = segments[2]
  const isStableRootShoot =
    depth === 1 && Boolean(categoryName?.startsWith(SHOOT_FOLDER_KEY_PREFIX))
  const kind =
    depth === 0
      ? "root"
      : isStableRootShoot
        ? "shoot"
        : depth === 1
          ? "category"
          : depth === 2
            ? "shoot"
            : "nested"

  return {
    folderPath,
    segments,
    depth,
    kind,
    categoryName,
    shootName,
    isStableRootShoot,
    displayPath: segments.slice(1).join(" / ") || "Project",
  } satisfies {
    folderPath: string
    segments: string[]
    depth: number
    kind: CloudinaryFolderKind
    categoryName?: string
    shootName?: string
    isStableRootShoot: boolean
    displayPath: string
  }
}

function validateFolderSegment(segment: string) {
  if (!segment) {
    throw new Error("Folder names cannot be empty.")
  }

  if (segment !== segment.trim()) {
    throw new Error("Folder names cannot start or end with spaces.")
  }

  if (FORBIDDEN_FOLDER_CHARS.test(segment)) {
    throw new Error("Folder names cannot contain ? & # \\ % < > or +.")
  }
}

function isDollaFolderPath(folderPath: string) {
  return (
    folderPath === CLOUDINARY_ROOT_FOLDER ||
    folderPath.startsWith(`${CLOUDINARY_ROOT_FOLDER}/`)
  )
}

function isSameOrChildFolder(folderPath: string, parentPath: string) {
  return folderPath === parentPath || folderPath.startsWith(`${parentPath}/`)
}

function readRawFolder(value: unknown): CloudinaryRawFolder | null {
  const folderPath = readString(value, "path")

  if (!folderPath) {
    return null
  }

  return {
    name: readString(value, "name"),
    path: folderPath,
  }
}

function readRawAsset(value: unknown): CloudinaryUploadResult | null {
  const publicId = readString(value, "public_id")

  if (!publicId) {
    return null
  }

  return {
    asset_id: readString(value, "asset_id"),
    public_id: publicId,
    asset_folder: readString(value, "asset_folder"),
    display_name: readString(value, "display_name"),
    filename: readString(value, "filename"),
    format: readString(value, "format"),
    resource_type: readString(value, "resource_type"),
    bytes: readNumber(value, "bytes"),
    width: readNumber(value, "width"),
    height: readNumber(value, "height"),
    aspect_ratio: readNumber(value, "aspect_ratio"),
    secure_url: readString(value, "secure_url"),
    context: readObject(value, "context"),
  }
}

function mapFolder(folder: CloudinaryRawFolder) {
  const folderInfo = getFolderInfo(folder.path || CLOUDINARY_ROOT_FOLDER)

  return {
    name: folder.name || folderInfo.segments.at(-1) || folderInfo.folderPath,
    path: folderInfo.folderPath,
    displayPath: folderInfo.displayPath,
    kind: folderInfo.kind,
    depth: folderInfo.depth,
    parentPath: folderInfo.isStableRootShoot
      ? null
      : folderInfo.segments.length > 1
        ? folderInfo.segments.slice(0, -1).join("/")
        : null,
    categoryName: folderInfo.categoryName,
    shootName: folderInfo.shootName,
  } satisfies CloudinaryFolder
}

function mapAsset(asset: CloudinaryUploadResult) {
  const secureUrl = asset.secure_url || ""
  const publicId = asset.public_id || ""
  const resourceType = asset.resource_type || "image"
  const format = asset.format || "asset"
  const folderInfo = getFolderInfo(asset.asset_folder || CLOUDINARY_ROOT_FOLDER)

  return {
    assetId: asset.asset_id || publicId,
    publicId,
    folder: folderInfo.folderPath,
    displayName: asset.display_name || asset.filename || publicId,
    format,
    resourceType,
    bytes: asset.bytes || 0,
    width: asset.width,
    height: asset.height,
    aspectRatio: asset.aspect_ratio,
    secureUrl,
    thumbnailUrl: getThumbnailUrl({
      secureUrl,
      resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspect_ratio,
    }),
    thumbnailSrcSet: getThumbnailSrcSet({
      secureUrl,
      resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspect_ratio,
    }),
    previewUrl:
      resourceType === "image"
        ? withCloudinaryTransformation(
            secureUrl,
            "c_limit,w_1800/f_auto/q_auto"
          )
        : secureUrl,
    displayFolder: folderInfo.displayPath,
    categoryName: folderInfo.categoryName,
    shootName: folderInfo.shootName,
    context: normalizeContext(asset.context),
  } satisfies CloudinaryAsset
}

function mapConvexFolder(folder: ConvexFolderView): CloudinaryFolder {
  return {
    name: folder.name,
    path: folder.path,
    displayPath: folder.displayPath,
    kind: folder.kind,
    depth: folder.depth,
    parentPath: folder.parentPath,
    categoryName: folder.categoryName || undefined,
    shootName: folder.shootName || undefined,
    orderRank: folder.orderRank,
    coverShootPath: folder.coverShootPath || undefined,
    coverAssetId: folder.coverAssetId || undefined,
    description: folder.description ?? undefined,
    credits: folder.credits || undefined,
  }
}

function mapConvexAsset(asset: ConvexAssetView): CloudinaryAsset {
  return {
    assetId: asset.assetId,
    publicId: asset.publicId,
    folder: asset.folder,
    displayName: asset.displayName,
    format: asset.format,
    resourceType: asset.resourceType,
    bytes: asset.bytes,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    aspectRatio: asset.aspectRatio ?? undefined,
    secureUrl: asset.secureUrl,
    thumbnailUrl: getThumbnailUrl({
      secureUrl: asset.secureUrl,
      resourceType: asset.resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspectRatio,
    }),
    thumbnailSrcSet: getThumbnailSrcSet({
      secureUrl: asset.secureUrl,
      resourceType: asset.resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspectRatio,
    }),
    previewUrl: asset.previewUrl,
    displayFolder: asset.displayFolder,
    categoryName: asset.categoryName || undefined,
    shootName: asset.shootName || undefined,
    context: asset.context,
    orderRank: asset.orderRank,
    layoutColumn: asset.layoutColumn ?? undefined,
    layoutOrder: asset.layoutOrder ?? undefined,
    layoutColumnCount: asset.layoutColumnCount ?? undefined,
    homeCarouselOrderRank: asset.homeCarouselOrderRank ?? undefined,
  }
}

function mapConvexSiteAsset(asset: ConvexSiteAssetView): CloudinaryAsset {
  return {
    assetId: asset.assetId,
    publicId: asset.publicId,
    folder: asset.folder,
    displayName: asset.displayName,
    format: asset.format,
    resourceType: asset.resourceType,
    bytes: asset.bytes,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    aspectRatio: asset.aspectRatio ?? undefined,
    secureUrl: asset.secureUrl,
    thumbnailUrl: getThumbnailUrl({
      secureUrl: asset.secureUrl,
      resourceType: asset.resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspectRatio,
    }),
    thumbnailSrcSet: getThumbnailSrcSet({
      secureUrl: asset.secureUrl,
      resourceType: asset.resourceType,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspectRatio,
    }),
    previewUrl: asset.previewUrl,
    displayFolder: asset.displayFolder,
    context: asset.context,
  }
}

function mapSiteAsset(asset: CloudinaryAsset) {
  return {
    assetId: asset.assetId,
    publicId: asset.publicId,
    folder: asset.folder,
    displayName: asset.displayName,
    format: asset.format,
    resourceType: asset.resourceType,
    bytes: asset.bytes,
    width: asset.width ?? null,
    height: asset.height ?? null,
    aspectRatio: asset.aspectRatio ?? null,
    secureUrl: asset.secureUrl,
    thumbnailUrl: asset.thumbnailUrl,
    previewUrl: asset.previewUrl,
    displayFolder: asset.displayFolder,
    context: asset.context,
  }
}

function mapConvexCategorySummary(
  category: ConvexCategorySummaryView
): CloudinaryHome["categories"][number] {
  return {
    name: category.name,
    path: category.path,
    orderRank: category.orderRank,
    cover: category.cover ? mapConvexAsset(category.cover) : null,
    shootCount: category.shootCount,
    assetCount: category.assetCount || 0,
    isDirectPhotoCategory: category.isDirectPhotoCategory === true,
  }
}

function mapSyncFolder(folder: CloudinaryFolder) {
  return {
    name: folder.name,
    path: folder.path,
    displayPath: folder.displayPath,
    kind: folder.kind,
    depth: folder.depth,
    parentPath: folder.parentPath,
    categoryName: folder.categoryName || null,
    shootName: folder.shootName || null,
  }
}

function getSyncAssetAssignment(folderInfo: ReturnType<typeof getFolderInfo>) {
  const isDirectCategoryAsset = isDirectPhotoCategoryPath(
    folderInfo.folderPath,
    CLOUDINARY_ROOT_FOLDER
  )

  if (folderInfo.kind === "category" && !isDirectCategoryAsset) {
    return {
      categoryPath: null,
      categoryName: null,
      shootName: folderInfo.categoryName || null,
    }
  }

  if (isDirectCategoryAsset) {
    return {
      categoryPath: folderInfo.folderPath,
      categoryName: folderInfo.categoryName || null,
      shootName: folderInfo.categoryName || null,
    }
  }

  if (folderInfo.isStableRootShoot) {
    return {
      categoryPath: null,
      categoryName: null,
      shootName: null,
    }
  }

  if (folderInfo.kind !== "shoot" || !folderInfo.categoryName) {
    return null
  }

  if (!folderInfo.shootName) {
    return null
  }

  return {
    categoryPath: `${CLOUDINARY_ROOT_FOLDER}/${folderInfo.categoryName}`,
    categoryName: folderInfo.categoryName,
    shootName: folderInfo.shootName,
  }
}

function mapSyncAsset(asset: CloudinaryAsset) {
  const folderInfo = getFolderInfo(asset.folder)
  const assignment = getSyncAssetAssignment(folderInfo)

  if (!assignment) {
    return null
  }

  return {
    assetId: asset.assetId,
    publicId: asset.publicId,
    folder: asset.folder,
    categoryPath: assignment.categoryPath,
    shootPath: asset.folder,
    categoryName: assignment.categoryName,
    shootName: assignment.shootName,
    displayName: asset.displayName,
    format: asset.format,
    resourceType: asset.resourceType,
    bytes: asset.bytes,
    width: asset.width ?? null,
    height: asset.height ?? null,
    aspectRatio: asset.aspectRatio ?? null,
    secureUrl: asset.secureUrl,
    thumbnailUrl: asset.thumbnailUrl,
    previewUrl: asset.previewUrl,
    displayFolder: asset.displayFolder,
    context: asset.context,
  }
}

async function syncCloudinaryMetadata({
  client,
  folders,
  assets,
  markMissingFolders,
  assetFolderPaths = [],
}: {
  client: ConvexMediaClient
  folders: CloudinaryFolder[]
  assets: CloudinaryAsset[]
  markMissingFolders: boolean
  assetFolderPaths?: string[]
}) {
  await client.mutation(api.media.syncSnapshot, {
    folders: folders
      .filter(
        (folder) =>
          folder.kind === "category" ||
          (folder.kind === "shoot" &&
            !isDirectPhotoCategoryPath(
              folder.parentPath,
              CLOUDINARY_ROOT_FOLDER
            ))
      )
      .map(mapSyncFolder),
    assets: assets
      .map(mapSyncAsset)
      .filter((asset): asset is NonNullable<typeof asset> => asset !== null),
    markMissingFolders,
    assetFolderPaths,
  })
}

function getGalleryAssetFolderPaths(folders: CloudinaryFolder[]) {
  const folderPaths = new Set<string>()

  for (const folder of folders) {
    if (folder.kind === "category") {
      folderPaths.add(folder.path)
      continue
    }

    if (
      folder.kind === "shoot" &&
      !isDirectPhotoCategoryPath(folder.parentPath, CLOUDINARY_ROOT_FOLDER)
    ) {
      folderPaths.add(folder.path)
    }
  }

  return Array.from(folderPaths)
}

async function searchDollaGalleryAssets(folders: CloudinaryFolder[]) {
  const assetFolderPaths = getGalleryAssetFolderPaths(folders)

  if (assetFolderPaths.length === 0) {
    return []
  }

  return await searchAssetsInFolders({
    folderPaths: assetFolderPaths,
    imageOnly: true,
  })
}

async function syncCloudinaryCatalog({
  assets,
  client,
  folders,
}: {
  assets: CloudinaryAsset[]
  client: ConvexMediaClient
  folders: CloudinaryFolder[]
}) {
  await syncCloudinaryMetadata({
    client,
    folders,
    assets,
    markMissingFolders: true,
    assetFolderPaths: getGalleryAssetFolderPaths(folders),
  })
}

async function readSyncedLibrary({
  client,
  connection,
  folderPath,
}: {
  client: ConvexMediaClient
  connection: CloudinaryConnection
  folderPath: string
}): Promise<CloudinaryLibrary> {
  const library = await client.query(api.media.getLibrary, { folderPath })

  return {
    connection,
    rootFolder: CLOUDINARY_ROOT_FOLDER,
    selectedFolder: library.selectedFolder,
    folders: library.folders.map(mapConvexFolder),
    assets: library.assets.map(mapConvexAsset),
    totalFolders: library.totalFolders,
    totalAssets: library.totalAssets,
  }
}

async function readSyncedHome({
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

async function readConvexCategoryNavigation(): Promise<
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

async function readSyncedCategory({
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

async function readSyncedShoot({
  client,
  connection,
  categoryPath,
  shootPath,
}: {
  client: ConvexMediaClient
  connection: CloudinaryConnection
  categoryPath: string
  shootPath: string
}): Promise<CloudinaryShootPage> {
  const shootPage = await client.query(api.media.getShoot, {
    categoryPath,
    shootPath,
  })

  return {
    connection,
    rootFolder: CLOUDINARY_ROOT_FOLDER,
    category: shootPage.category ? mapConvexFolder(shootPage.category) : null,
    shoot: shootPage.shoot ? mapConvexFolder(shootPage.shoot) : null,
    categories: shootPage.categories.map(mapConvexCategorySummary),
    assets: shootPage.assets.map(mapConvexAsset),
  }
}

async function tryReadCachedHome({
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

async function tryReadCachedCategory({
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

async function tryReadCachedShoot({
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

function hasCachedHomeData(home: CloudinaryHome) {
  return (
    home.categories.length > 0 ||
    home.heroAssets.length > 0 ||
    home.latestAssets.length > 0
  )
}

function hasCachedCategoryData(categoryPage: CloudinaryCategoryPage) {
  return (
    Boolean(categoryPage.category) ||
    categoryPage.categories.length > 0 ||
    categoryPage.shoots.length > 0 ||
    categoryPage.assets.length > 0
  )
}

function hasCachedShootData(shootPage: CloudinaryShootPage) {
  return (
    Boolean(shootPage.category) ||
    Boolean(shootPage.shoot) ||
    shootPage.categories.length > 0 ||
    shootPage.assets.length > 0
  )
}

function normalizeContext(context: object | undefined) {
  if (!context) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, String(value)])
  )
}

function withCloudinaryTransformation(url: string, transformation: string) {
  const uploadMarker = "/upload/"
  const uploadIndex = url.indexOf(uploadMarker)

  if (uploadIndex === -1) {
    return url
  }

  return `${url.slice(0, uploadIndex + uploadMarker.length)}${transformation}/${url.slice(
    uploadIndex + uploadMarker.length
  )}`
}

function getThumbnailUrl({
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

function getThumbnailSrcSet({
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

function isLandscapeAssetDimensions({
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

function escapeSearchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
}

function buildAssetFolderExpression(folderPaths: string[]) {
  const quotedFolders = folderPaths.map(
    (folderPath) => `"${escapeSearchValue(folderPath)}"`
  )

  if (quotedFolders.length === 1) {
    return `asset_folder:${quotedFolders[0]}`
  }

  return `(${quotedFolders
    .map((quotedFolder) => `asset_folder:${quotedFolder}`)
    .join(" OR ")})`
}

function ensureRootFolder(folders: CloudinaryFolder[]) {
  if (folders.some((folder) => folder.path === CLOUDINARY_ROOT_FOLDER)) {
    return folders
  }

  return [
    {
      name: CLOUDINARY_ROOT_FOLDER,
      path: CLOUDINARY_ROOT_FOLDER,
      displayPath: "Project",
      kind: "root" as const,
      depth: 0,
      parentPath: null,
    },
    ...folders,
  ]
}

function ensureDirectPhotoCategoryFolder(folders: CloudinaryFolder[]) {
  if (folders.some((folder) => isDirectPhotoCategoryFolder(folder))) {
    return folders
  }

  return [
    ...folders,
    {
      name: DIRECT_PHOTO_CATEGORY_NAME,
      path: getDirectPhotoCategoryPath(CLOUDINARY_ROOT_FOLDER),
      displayPath: DIRECT_PHOTO_CATEGORY_NAME,
      kind: "category" as const,
      depth: 1,
      parentPath: CLOUDINARY_ROOT_FOLDER,
      categoryName: DIRECT_PHOTO_CATEGORY_NAME,
    },
  ]
}

function sortFolders(folders: CloudinaryFolder[]): CloudinaryFolder[] {
  const sortedFolders = folders.slice()

  sortedFolders.sort((first, second) =>
    first.path.localeCompare(second.path, undefined, { sensitivity: "base" })
  )

  return sortedFolders
}

function dedupeAssets(assets: CloudinaryAsset[]) {
  const assetsById = new Map<string, CloudinaryAsset>()

  for (const asset of assets) {
    assetsById.set(asset.assetId, asset)
  }

  return Array.from(assetsById.values())
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function isCloudinaryAssetId(value: string) {
  return /^[a-f0-9]{32}$/i.test(value)
}

function getFolderSearchBuilder(): CloudinarySearchBuilder {
  const candidate = Reflect.get(cloudinary, "search_folders")

  if (
    typeof candidate === "function" &&
    typeof Reflect.get(candidate, "expression") === "function"
  ) {
    return candidate
  }

  throw new Error("The Cloudinary SDK does not expose folder search.")
}

function mergeKnownCloudinaryFolders(
  folders: CloudinaryFolder[],
  knownFolderPaths: string[] = []
) {
  if (knownFolderPaths.length === 0) {
    return folders
  }

  const foldersByPath = new Map(folders.map((folder) => [folder.path, folder]))

  for (const knownFolderPath of knownFolderPaths) {
    const folderPath = normalizeDollaFolderPath(knownFolderPath)

    if (!foldersByPath.has(folderPath)) {
      foldersByPath.set(folderPath, mapFolder({ path: folderPath }))
    }
  }

  return sortFolders(Array.from(foldersByPath.values()))
}

async function searchDollaFolders(
  options: CloudinaryFolderSearchOptions = {}
): Promise<CloudinaryFolder[]> {
  const response = await getFolderSearchBuilder()
    .expression(`path:${CLOUDINARY_ROOT_FOLDER}*`)
    .max_results(500)
    .execute()
  const folders = readArray(response, "folders")
    .map(readRawFolder)
    .filter((folder): folder is CloudinaryRawFolder => folder !== null)
    .filter((folder) => isDollaFolderPath(folder.path || ""))
    .map(mapFolder)

  return mergeKnownCloudinaryFolders(
    sortFolders(ensureDirectPhotoCategoryFolder(ensureRootFolder(folders))),
    options.knownFolderPaths
  )
}

async function searchAssetsInFolders({
  folderPaths,
  imageOnly,
  maxResults,
}: {
  folderPaths: string[]
  imageOnly: boolean
  maxResults?: number
}): Promise<CloudinaryAsset[]> {
  const folders = folderPaths.map(normalizeDollaFolderPath)

  if (folders.length === 0) {
    return []
  }

  const folderExpression = buildAssetFolderExpression(folders)
  const expression = imageOnly
    ? `resource_type:image AND ${folderExpression}`
    : folderExpression
  const rawAssets: CloudinaryUploadResult[] = []
  let nextCursor: string | undefined
  const resultLimit = maxResults ?? Number.POSITIVE_INFINITY

  while (rawAssets.length < resultLimit) {
    const pageSize = Math.min(500, resultLimit - rawAssets.length)
    const search = cloudinary.search
      .expression(expression)
      .with_field(["context", "tags"])
      .max_results(pageSize)
      .sort_by("created_at", "desc")

    if (nextCursor) {
      search.next_cursor(nextCursor)
    }

    const response = await search.execute()
    const pageAssets = readArray(response, "resources")
      .map(readRawAsset)
      .filter((asset): asset is CloudinaryUploadResult => asset !== null)

    rawAssets.push(...pageAssets)

    nextCursor = readString(response, "next_cursor")

    if (!nextCursor || pageAssets.length === 0) {
      break
    }
  }

  return rawAssets.map(mapAsset)
}

async function getAssetsForFolder(
  folderPath: string
): Promise<CloudinaryAsset[]> {
  return searchAssetsInFolders({
    folderPaths: [folderPath],
    imageOnly: false,
    maxResults: 80,
  })
}

async function shouldMarkSelectedAssetFolder(folderPath: string) {
  const folderInfo = getFolderInfo(folderPath)

  if (folderInfo.kind === "shoot") {
    return true
  }

  if (isDirectPhotoCategoryPath(folderPath, CLOUDINARY_ROOT_FOLDER)) {
    return true
  }

  if (folderInfo.kind !== "category") {
    return false
  }

  return await isActiveConvexShootFolder(folderPath)
}

async function getCloudinaryLibrary(
  folderPath = CLOUDINARY_ROOT_FOLDER,
  options: CloudinaryFolderSearchOptions = {}
): Promise<CloudinaryLibrary> {
  const requestedFolder = normalizeDollaFolderPath(folderPath)
  const connectionState = getCloudinaryConfigState()

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      selectedFolder: requestedFolder,
      folders: ensureRootFolder([]),
      assets: [],
      totalFolders: 1,
      totalAssets: 0,
    } satisfies CloudinaryLibrary
  }

  try {
    configureCloudinary()

    const folders = await searchDollaFolders(options)
    const selectedFolder = chooseSelectedFolder(folders, requestedFolder)
    const assets =
      selectedFolder === CLOUDINARY_ROOT_FOLDER
        ? await searchAssetsInFolders({
            folderPaths: folders.map((folder) => folder.path),
            imageOnly: false,
            maxResults: 80,
          })
        : await getAssetsForFolder(selectedFolder)

    const directLibrary = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      selectedFolder,
      folders,
      assets,
      totalFolders: folders.length,
      totalAssets: assets.length,
    } satisfies CloudinaryLibrary
    const convexClient = getConvexMediaClient()

    if (!convexClient) {
      return directLibrary
    }

    try {
      await syncCloudinaryMetadata({
        client: convexClient,
        folders,
        assets,
        markMissingFolders: true,
        assetFolderPaths: (await shouldMarkSelectedAssetFolder(selectedFolder))
          ? [selectedFolder]
          : [],
      })

      return await readSyncedLibrary({
        client: convexClient,
        connection: connectionState,
        folderPath: selectedFolder,
      })
    } catch (error) {
      return {
        ...directLibrary,
        connection: {
          ...connectionState,
          error: `Convex metadata sync failed: ${getCloudinaryErrorMessage(error)}`,
        },
      } satisfies CloudinaryLibrary
    }
  } catch (error) {
    return {
      connection: {
        ...connectionState,
        error: getCloudinaryErrorMessage(error),
      },
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      selectedFolder: requestedFolder,
      folders: ensureRootFolder([]),
      assets: [],
      totalFolders: 1,
      totalAssets: 0,
    } satisfies CloudinaryLibrary
  }
}

function chooseSelectedFolder(
  folders: CloudinaryFolder[],
  requestedFolder: string
) {
  if (requestedFolder !== CLOUDINARY_ROOT_FOLDER) {
    return requestedFolder
  }

  return (
    folders.find((folder) => folder.kind === "category")?.path ||
    CLOUDINARY_ROOT_FOLDER
  )
}

async function getCloudinaryHome(
  options: CloudinaryReadOptions = {}
): Promise<CloudinaryHome> {
  const connectionState = getCloudinaryConfigState()

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      heroAssets: [],
      latestAssets: [],
    } satisfies CloudinaryHome
  }

  const cachedHome = await tryReadCachedHome({
    connection: connectionState,
    options,
  })

  if (cachedHome) {
    return cachedHome
  }

  try {
    configureCloudinary()

    const folders = await searchDollaFolders()
    const syncedAssets = await searchDollaGalleryAssets(folders)
    const latestAssets = syncedAssets.slice(0, HOME_LATEST_ASSET_LIMIT)

    const directHome = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: getCategorySummaries(folders, syncedAssets),
      heroAssets: latestAssets.slice(0, 7),
      latestAssets,
    } satisfies CloudinaryHome
    const convexClient = getConvexMediaClient()

    if (!convexClient) {
      return directHome
    }

    try {
      await syncCloudinaryCatalog({
        client: convexClient,
        folders,
        assets: syncedAssets,
      })

      return await readSyncedHome({
        client: convexClient,
        connection: connectionState,
      })
    } catch (error) {
      return {
        ...directHome,
        connection: {
          ...connectionState,
          error: `Convex metadata sync failed: ${getCloudinaryErrorMessage(error)}`,
        },
      } satisfies CloudinaryHome
    }
  } catch (error) {
    return {
      connection: {
        ...connectionState,
        error: getCloudinaryErrorMessage(error),
      },
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      heroAssets: [],
      latestAssets: [],
    } satisfies CloudinaryHome
  }
}

async function getCloudinaryAbout(): Promise<CloudinaryAbout> {
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

async function getCloudinaryPricing(): Promise<CloudinaryPricing> {
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

function getCategorySummaries(
  folders: CloudinaryFolder[],
  latestAssets: CloudinaryAsset[]
): CloudinaryHome["categories"] {
  return folders
    .filter((folder) => folder.kind === "category")
    .map((folder) => {
      const shootCount = folders.filter(
        (candidate) => candidate.parentPath === folder.path
      ).length
      const directAssets = isDirectPhotoCategoryFolder(folder)
        ? latestAssets.filter((asset) => asset.folder === folder.path)
        : []

      return {
        name: folder.name,
        path: folder.path,
        orderRank: folder.orderRank,
        cover: findCategoryCoverAsset(latestAssets, folder.path),
        shootCount: isDirectPhotoCategoryFolder(folder) ? 0 : shootCount,
        assetCount: directAssets.length,
        isDirectPhotoCategory: isDirectPhotoCategoryFolder(folder),
      }
    })
}

function getShootSummaries({
  assets,
  shoots,
}: {
  assets: CloudinaryAsset[]
  shoots: CloudinaryFolder[]
}) {
  return shoots.map((shoot) => {
    const shootAssets = assets.filter((asset) => asset.folder === shoot.path)

    return {
      name: shoot.name,
      path: shoot.path,
      categoryName: shoot.categoryName || "",
      cover: shootAssets[0],
      assetCount: shootAssets.length,
    } satisfies CloudinaryShootSummary
  })
}

function findCategoryCoverAsset(
  assets: CloudinaryAsset[],
  categoryPath: string
) {
  return assets.find((asset) => isSameOrChildFolder(asset.folder, categoryPath))
}

function isDirectPhotoCategoryFolder(folder: CloudinaryFolder) {
  return isDirectPhotoCategoryPath(folder.path, CLOUDINARY_ROOT_FOLDER)
}

function getCategoryShootFolders(
  folders: CloudinaryFolder[],
  category: CloudinaryFolder | undefined
) {
  if (!category || isDirectPhotoCategoryFolder(category)) {
    return []
  }

  return folders.filter(
    (folder) => folder.kind === "shoot" && folder.parentPath === category.path
  )
}

function getShootSelection({
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

async function getCloudinaryCategory(
  categoryName: string,
  options: CloudinaryReadOptions = {}
): Promise<CloudinaryCategoryPage> {
  const connectionState = getCloudinaryConfigState()

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      shoots: [],
      assets: [],
    } satisfies CloudinaryCategoryPage
  }

  const cachedCategory = await tryReadCachedCategory({
    categoryName,
    connection: connectionState,
    options,
  })

  if (cachedCategory) {
    return cachedCategory
  }

  try {
    configureCloudinary()

    const folders = await searchDollaFolders()
    const category = findCategoryFolderByRouteSegment(folders, categoryName)
    const categoryPath = category?.path || buildCategoryFolderPath(categoryName)
    const shoots = getCategoryShootFolders(folders, category)
    const syncedAssets = await searchDollaGalleryAssets(folders)
    const categoryAssets = category
      ? syncedAssets.filter((asset) =>
          isSameOrChildFolder(asset.folder, category.path)
        )
      : []
    const directCategoryAssets =
      category && isDirectPhotoCategoryFolder(category)
        ? categoryAssets.filter((asset) => asset.folder === category.path)
        : []

    const directCategoryPage = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      category,
      categories: getCategorySummaries(folders, syncedAssets),
      shoots: getShootSummaries({ assets: categoryAssets, shoots }),
      assets: directCategoryAssets,
    } satisfies CloudinaryCategoryPage
    const convexClient = getConvexMediaClient()

    if (!convexClient) {
      return directCategoryPage
    }

    try {
      await syncCloudinaryCatalog({
        client: convexClient,
        folders,
        assets: syncedAssets,
      })

      return await readSyncedCategory({
        client: convexClient,
        connection: connectionState,
        categoryPath,
      })
    } catch (error) {
      return {
        ...directCategoryPage,
        connection: {
          ...connectionState,
          error: `Convex metadata sync failed: ${getCloudinaryErrorMessage(error)}`,
        },
      } satisfies CloudinaryCategoryPage
    }
  } catch (error) {
    return {
      connection: {
        ...connectionState,
        error: getCloudinaryErrorMessage(error),
      },
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      shoots: [],
      assets: [],
    } satisfies CloudinaryCategoryPage
  }
}

async function getCloudinaryShoot(
  categoryName: string,
  shootName: string,
  options: CloudinaryReadOptions = {}
): Promise<CloudinaryShootPage> {
  const connectionState = getCloudinaryConfigState()

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      assets: [],
    } satisfies CloudinaryShootPage
  }

  const cachedShoot = await tryReadCachedShoot({
    categoryName,
    connection: connectionState,
    options,
    shootName,
  })

  if (cachedShoot) {
    return cachedShoot
  }

  try {
    configureCloudinary()

    const folders = await searchDollaFolders()
    const { category, categoryPath, shoot, shootPath } = getShootSelection({
      categoryName,
      folders,
      shootName,
    })
    const syncedAssets = await searchDollaGalleryAssets(folders)
    const assets = shoot
      ? syncedAssets.filter((asset) => asset.folder === shoot.path)
      : []

    const directShootPage = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      category,
      shoot,
      categories: getCategorySummaries(folders, syncedAssets),
      assets,
    } satisfies CloudinaryShootPage
    const convexClient = getConvexMediaClient()

    if (!convexClient) {
      return directShootPage
    }

    try {
      await syncCloudinaryCatalog({
        client: convexClient,
        folders,
        assets: syncedAssets,
      })

      return await readSyncedShoot({
        client: convexClient,
        connection: connectionState,
        categoryPath,
        shootPath,
      })
    } catch (error) {
      return {
        ...directShootPage,
        connection: {
          ...connectionState,
          error: `Convex metadata sync failed: ${getCloudinaryErrorMessage(error)}`,
        },
      } satisfies CloudinaryShootPage
    }
  } catch (error) {
    return {
      connection: {
        ...connectionState,
        error: getCloudinaryErrorMessage(error),
      },
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories: [],
      assets: [],
    } satisfies CloudinaryShootPage
  }
}

async function createCloudinaryFolder(parentPath: string, name: string) {
  const normalizedParentPath = normalizeDollaFolderPath(parentPath)
  const parentInfo = getFolderInfo(normalizedParentPath)
  const client = getRequiredConvexMediaClient()

  if (parentInfo.kind === "root") {
    const categoryName = normalizeFolderName(name)

    await client.mutation(api.media.createCategory, {
      name: categoryName,
    })

    return getCloudinaryLibrary(buildCategoryFolderPath(categoryName))
  }

  if (parentInfo.kind !== "category") {
    throw new Error(
      "Create categories under the project or shoots in a category."
    )
  }

  if (
    isDirectPhotoCategoryPath(parentInfo.folderPath, CLOUDINARY_ROOT_FOLDER)
  ) {
    throw new Error("Mariage already has its own hidden shoot.")
  }

  const shootName = normalizeFolderName(name)
  const library = await client.query(api.media.getLibrary, {
    folderPath: CLOUDINARY_ROOT_FOLDER,
  })
  const existingShootInCategory = library.folders.some(
    (folder) =>
      folder.kind === "shoot" &&
      folder.parentPath === parentInfo.folderPath &&
      namesMatch(folder.name, shootName)
  )

  if (existingShootInCategory) {
    throw new Error("Shoot already exists in this category.")
  }

  configureCloudinary()

  const activeFolderPaths = new Set(
    library.folders.map((folder) => normalizeDollaFolderPath(folder.path))
  )
  const folderPath = await createRootShootCloudinaryFolder(activeFolderPaths)

  try {
    await client.mutation(api.media.createShoot, {
      categoryPath: parentInfo.folderPath,
      shootPath: folderPath,
      name: shootName,
    })
  } catch (error) {
    await cloudinary.api.delete_folder(folderPath).catch(() => undefined)

    throw error
  }

  return getCloudinaryLibrary(folderPath, { knownFolderPaths: [folderPath] })
}

async function createRootShootCloudinaryFolder(activeFolderPaths: Set<string>) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const folderPath = buildRootShootFolderPath(createShootFolderKey())

    if (activeFolderPaths.has(folderPath)) {
      continue
    }

    try {
      await cloudinary.api.create_folder(folderPath)

      return folderPath
    } catch (error) {
      if (!isExistingCloudinaryFolderError(error)) {
        throw error
      }

      activeFolderPaths.add(folderPath)
    }
  }

  throw new Error("Could not create a unique Cloudinary shoot folder.")
}

async function ensureCloudinaryFolderExists(folderPath: string) {
  try {
    await cloudinary.api.create_folder(folderPath)
  } catch (error) {
    if (!isExistingCloudinaryFolderError(error)) {
      throw error
    }
  }
}

function isExistingCloudinaryFolderError(error: unknown) {
  const message = getCloudinaryErrorMessage(error).toLowerCase()

  return message.includes("exists") || message.includes("already exist")
}

async function renameCloudinaryFolder(folderPath: string, name: string) {
  const fromFolder = normalizeDollaFolderPath(folderPath)
  const folderInfo = getFolderInfo(fromFolder)
  const client = getRequiredConvexMediaClient()

  if (folderInfo.kind !== "category" && folderInfo.kind !== "shoot") {
    throw new Error("Only category and shoot folders can be renamed.")
  }

  const isRootShootFolder =
    folderInfo.kind === "category" &&
    !isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER) &&
    (await isActiveConvexShootFolder(fromFolder))

  await client.mutation(api.media.renameFolder, {
    folderPath: fromFolder,
    name: normalizeFolderName(name),
  })

  const selectedFolder =
    folderInfo.kind === "category" && !isRootShootFolder
      ? buildCategoryFolderPath(name)
      : fromFolder

  return getCloudinaryLibrary(selectedFolder)
}

async function moveCloudinaryShoots({
  selectedFolder,
  shootPaths,
  targetCategoryPath,
}: {
  selectedFolder: string
  shootPaths: string[]
  targetCategoryPath: string
}) {
  const normalizedSelectedFolder = normalizeDollaFolderPath(selectedFolder)
  const normalizedTargetCategoryPath =
    normalizeDollaFolderPath(targetCategoryPath)
  const targetCategoryInfo = getFolderInfo(normalizedTargetCategoryPath)
  const normalizedShootPaths = getUniqueFolderPaths(shootPaths)

  if (targetCategoryInfo.kind !== "category") {
    throw new Error("Move shoots into a category folder.")
  }

  if (
    isDirectPhotoCategoryPath(
      normalizedTargetCategoryPath,
      CLOUDINARY_ROOT_FOLDER
    )
  ) {
    throw new Error(
      "Mariage displays its single shoot directly and cannot accept moved shoots."
    )
  }

  if (normalizedShootPaths.length === 0) {
    throw new Error("Select at least one shoot to move.")
  }

  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.moveShoots, {
    shootPaths: normalizedShootPaths,
    targetCategoryPath: normalizedTargetCategoryPath,
  })

  return getCloudinaryLibrary(normalizedSelectedFolder)
}

function getUniqueFolderPaths(folderPaths: string[]) {
  const uniquePaths = new Set<string>()

  for (const folderPath of folderPaths) {
    const normalizedPath = normalizeDollaFolderPath(folderPath)

    if (normalizedPath) {
      uniquePaths.add(normalizedPath)
    }
  }

  return Array.from(uniquePaths)
}

async function deleteCloudinaryAssets(assets: CloudinaryAsset[]) {
  const uniqueAssets = dedupeAssets(assets)
  const assetIds = uniqueAssets
    .map((asset) => asset.assetId)
    .filter(isCloudinaryAssetId)
  const publicIdsByResourceType = new Map<string, string[]>()

  for (const asset of uniqueAssets) {
    if (isCloudinaryAssetId(asset.assetId) || !asset.publicId) {
      continue
    }

    const resourceType = asset.resourceType || "image"
    const publicIds = publicIdsByResourceType.get(resourceType) || []

    publicIds.push(asset.publicId)
    publicIdsByResourceType.set(resourceType, publicIds)
  }

  for (const assetIdBatch of chunkItems(assetIds, DELETE_ASSET_BATCH_SIZE)) {
    await cloudinary.api.delete_resources_by_asset_ids(assetIdBatch, {
      invalidate: true,
    })
  }

  for (const [resourceType, publicIds] of publicIdsByResourceType) {
    for (const publicIdBatch of chunkItems(
      publicIds,
      DELETE_ASSET_BATCH_SIZE
    )) {
      await cloudinary.api.delete_resources(publicIdBatch, {
        invalidate: true,
        resource_type: resourceType,
      })
    }
  }
}

async function deleteCloudinaryFolder(folderPath: string) {
  const normalizedPath = normalizeDollaFolderPath(folderPath)
  const folderInfo = getFolderInfo(normalizedPath)

  if (normalizedPath === CLOUDINARY_ROOT_FOLDER) {
    throw new Error("The Dolla root folder cannot be deleted.")
  }

  if (folderInfo.kind !== "category" && folderInfo.kind !== "shoot") {
    throw new Error("Only category and shoot folders can be deleted.")
  }

  const parentPath = normalizedPath.split("/").slice(0, -1).join("/")
  const client = getRequiredConvexMediaClient()
  const activeShoot = await getActiveConvexShootFolder(client, normalizedPath)

  if (activeShoot) {
    if (
      isDirectPhotoCategoryPath(activeShoot.parentPath, CLOUDINARY_ROOT_FOLDER)
    ) {
      throw new Error("Mariage shoot cannot be deleted.")
    }

    configureCloudinary()
    await deleteCloudinaryShootFolder(normalizedPath)

    await client.mutation(api.media.deleteFolder, {
      folderPath: normalizedPath,
    })

    return getCloudinaryLibrary(activeShoot.parentPath || parentPath)
  }

  if (isDirectPhotoCategoryPath(normalizedPath, CLOUDINARY_ROOT_FOLDER)) {
    throw new Error("Mariage cannot be deleted.")
  }

  const categoryPage = await client.query(api.media.getCategory, {
    categoryPath: normalizedPath,
  })

  if (!categoryPage.category) {
    throw new Error("Folder not found.")
  }

  configureCloudinary()

  for (const shoot of categoryPage.shoots) {
    await deleteCloudinaryShootFolder(shoot.path)
  }

  await deleteCloudinaryShootFolder(normalizedPath)

  await client.mutation(api.media.deleteFolder, {
    folderPath: normalizedPath,
  })

  return getCloudinaryLibrary(CLOUDINARY_ROOT_FOLDER)
}

async function deleteCloudinaryShootFolder(folderPath: string) {
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

async function deleteEmptyCloudinaryFolder(folderPath: string) {
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

function getCloudinaryAdminApiErrorMessage(responseBody: string) {
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

function isMissingCloudinaryFolderError(error: unknown) {
  const message = getCloudinaryErrorMessage(error).toLowerCase()

  return message.includes("not found") || message.includes("does not exist")
}

async function deleteCloudinaryShootAssets({
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
    new Set(assetIds.map((assetId) => assetId.trim()).filter(Boolean))
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

async function uploadCloudinaryFile(file: File, folderPath: string) {
  configureCloudinary()

  const selectedFolder =
    await resolveCloudinaryPhotoUploadFolderPath(folderPath)
  const bytes = Buffer.from(await file.arrayBuffer())

  const result = await new Promise<CloudinaryUploadResult>(
    (resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          asset_folder: selectedFolder,
          overwrite: false,
          resource_type: "auto",
          tags: ["dolla-admin"],
          unique_filename: true,
          use_filename: true,
          use_filename_as_display_name: true,
        },
        (error, response) => {
          if (error) {
            reject(error)
            return
          }

          if (!response) {
            reject(new Error("Cloudinary did not return an upload response."))
            return
          }

          resolve(response)
        }
      )

      upload.end(bytes)
    }
  )

  return syncUploadedCloudinaryAsset(mapAsset(result))
}

async function createCloudinaryDirectUploadSignature({
  folderPath,
  target,
}: {
  folderPath: string
  target?: string
}): Promise<CloudinaryDirectUploadSignature> {
  configureCloudinary()

  if (target === "about-image") {
    return signCloudinaryUploadParams({
      asset_folder: CLOUDINARY_ROOT_FOLDER,
      display_name: "About image",
      invalidate: "true",
      overwrite: "true",
      public_id: ABOUT_IMAGE_PUBLIC_ID,
      tags: "dolla-admin,dolla-about",
      timestamp: getCloudinaryUploadTimestamp(),
      unique_filename: "false",
      use_filename: "false",
    })
  }

  const selectedFolder =
    await resolveCloudinaryPhotoUploadFolderPath(folderPath)

  return signCloudinaryUploadParams({
    asset_folder: selectedFolder,
    overwrite: "false",
    tags: "dolla-admin",
    timestamp: getCloudinaryUploadTimestamp(),
    unique_filename: "true",
    use_filename: "true",
    use_filename_as_display_name: "true",
  })
}

async function completeCloudinaryDirectUpload({
  folderPath,
  target,
  uploadResult,
}: {
  folderPath: string
  target?: string
  uploadResult: unknown
}) {
  configureCloudinary()

  if (target === "about-image") {
    return {
      about: await completeCloudinaryAboutImageUpload(uploadResult),
    }
  }

  const selectedFolder =
    await resolveCloudinaryPhotoUploadFolderPath(folderPath)
  const asset = await getVerifiedCloudinaryUploadAsset(uploadResult)

  if (asset.folder !== selectedFolder) {
    throw new Error("Uploaded photo was stored in the wrong folder.")
  }

  return {
    assets: [await syncUploadedCloudinaryAsset(asset)],
    folderPath: selectedFolder,
  }
}

function getCloudinaryUploadTimestamp() {
  return String(Math.floor(Date.now() / 1000))
}

function signCloudinaryUploadParams(
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

async function resolveCloudinaryPhotoUploadFolderPath(folderPath: string) {
  const selectedFolder = await resolveDirectPhotoCategoryShootPath(
    normalizeDollaFolderPath(folderPath)
  )
  const folderInfo = getFolderInfo(selectedFolder)
  const isRootShootFolder =
    folderInfo.kind === "category" &&
    !isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER) &&
    (await isActiveConvexShootFolder(selectedFolder))

  if (
    folderInfo.kind !== "shoot" &&
    !isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER) &&
    !isRootShootFolder
  ) {
    throw new Error("Upload photos into a shoot folder or Mariage.")
  }

  if (
    isDirectPhotoCategoryPath(folderInfo.folderPath, CLOUDINARY_ROOT_FOLDER)
  ) {
    await ensureCloudinaryFolderExists(selectedFolder)
  }

  return selectedFolder
}

async function getVerifiedCloudinaryUploadAsset(uploadResult: unknown) {
  const uploadedAsset = readRawAsset(uploadResult)

  if (!uploadedAsset?.public_id || !uploadedAsset.asset_id) {
    throw new Error("Cloudinary did not return an uploaded asset.")
  }

  const response = await cloudinary.api.resource(uploadedAsset.public_id, {
    resource_type: "image",
  })
  const canonicalAsset = readRawAsset(response)

  if (!canonicalAsset) {
    throw new Error("Uploaded photo could not be verified in Cloudinary.")
  }

  if (
    !canonicalAsset.asset_id ||
    uploadedAsset.asset_id !== canonicalAsset.asset_id
  ) {
    throw new Error("Uploaded photo verification failed.")
  }

  return mapAsset(canonicalAsset)
}

async function syncUploadedCloudinaryAsset(asset: CloudinaryAsset) {
  const convexClient = getConvexMediaClient()

  if (convexClient) {
    await syncCloudinaryMetadata({
      client: convexClient,
      folders: [],
      assets: [asset],
      markMissingFolders: false,
    })
  }

  return asset
}

async function isActiveConvexShootFolder(folderPath: string) {
  return Boolean(await getActiveConvexShootFolder(undefined, folderPath))
}

async function getActiveConvexShootFolder(
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

async function resolveDirectPhotoCategoryShootPath(folderPath: string) {
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

async function replaceCloudinaryAboutImage(file: File) {
  const convexClient = getRequiredConvexMediaClient()

  configureCloudinary()
  validateImageFile(file)

  const previousImage = await getCurrentCloudinaryAboutImage()
  const uploadedImage = await uploadCloudinaryAboutImage(file)

  try {
    await convexClient.mutation(api.media.setSiteAsset, {
      key: ABOUT_IMAGE_SITE_ASSET_KEY,
      asset: mapSiteAsset(uploadedImage),
    })
  } catch (error) {
    await deleteCloudinaryAssets([uploadedImage]).catch(() => undefined)
    throw error
  }

  if (previousImage && previousImage.publicId !== uploadedImage.publicId) {
    await deleteCloudinaryAssets([previousImage])
  }

  return getCloudinaryAbout()
}

async function getCurrentCloudinaryAboutImage() {
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

async function uploadCloudinaryAboutImage(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer())

  const result = await new Promise<CloudinaryUploadResult>(
    (resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          asset_folder: CLOUDINARY_ROOT_FOLDER,
          display_name: "About image",
          invalidate: true,
          overwrite: true,
          public_id: ABOUT_IMAGE_PUBLIC_ID,
          resource_type: "image",
          tags: ["dolla-admin", "dolla-about"],
          unique_filename: false,
          use_filename: false,
        },
        (error, response) => {
          if (error) {
            reject(error)
            return
          }

          if (!response) {
            reject(new Error("Cloudinary did not return an upload response."))
            return
          }

          resolve(response)
        }
      )

      upload.end(bytes)
    }
  )

  return mapAsset(result)
}

async function completeCloudinaryAboutImageUpload(uploadResult: unknown) {
  const convexClient = getRequiredConvexMediaClient()
  const previousImage = await getCurrentCloudinaryAboutImage()
  const uploadedImage = await getVerifiedCloudinaryUploadAsset(uploadResult)

  if (
    uploadedImage.folder !== CLOUDINARY_ROOT_FOLDER ||
    uploadedImage.publicId !== ABOUT_IMAGE_PUBLIC_ID
  ) {
    throw new Error("Uploaded about image was stored in the wrong location.")
  }

  try {
    await convexClient.mutation(api.media.setSiteAsset, {
      key: ABOUT_IMAGE_SITE_ASSET_KEY,
      asset: mapSiteAsset(uploadedImage),
    })
  } catch (error) {
    await deleteCloudinaryAssets([uploadedImage]).catch(() => undefined)
    throw error
  }

  if (previousImage && previousImage.publicId !== uploadedImage.publicId) {
    await deleteCloudinaryAssets([previousImage])
  }

  return getCloudinaryAbout()
}

function validateImageFile(file: File) {
  if (file.type && !file.type.toLowerCase().startsWith("image/")) {
    throw new Error("Choose an image file.")
  }
}

async function reorderCloudinaryShoots({
  categoryPath,
  shootPaths,
}: {
  categoryPath: string
  shootPaths: string[]
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.reorderShoots, {
    categoryPath: normalizeDollaFolderPath(categoryPath),
    shootPaths: shootPaths.map(normalizeDollaFolderPath),
  })

  return null
}

async function reorderCloudinaryCategories({
  categoryPaths,
}: {
  categoryPaths: string[]
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.reorderCategories, {
    categoryPaths: categoryPaths.map(normalizeDollaFolderPath),
  })

  return null
}

async function reorderCloudinaryAssets({
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

async function setCloudinaryShootCover({
  shootPath,
  assetId,
}: {
  shootPath: string
  assetId: string
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setShootCover, {
    shootPath: normalizeDollaFolderPath(shootPath),
    assetId,
  })

  return null
}

async function setCloudinaryHomeCarouselAsset({
  assetId,
  selected,
}: {
  assetId: string
  selected: boolean
}) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setHomeCarouselAsset, {
    assetId,
    selected,
  })

  return null
}

async function setCloudinaryShootCredits({
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

async function setCloudinaryCategoryDescription({
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

async function setCloudinaryAboutContent({
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

async function setCloudinaryPricingItems({ items }: { items: PricingItem[] }) {
  const client = getRequiredConvexMediaClient()

  await client.mutation(api.media.setSiteContent, {
    key: "pricing",
    blocks: getPricingContentBlocks(items),
  })

  return null
}

async function setCloudinaryCategoryCover({
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

function getCloudinaryErrorMessage(error: unknown) {
  if (error instanceof CloudinaryConfigError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  const message = getUnknownErrorMessage(error)

  if (message) {
    return message
  }

  return "Cloudinary request failed."
}

function getUnknownErrorMessage(error: unknown): string | null {
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

export {
  CLOUDINARY_ROOT_FOLDER,
  completeCloudinaryDirectUpload,
  createCloudinaryFolder,
  createCloudinaryDirectUploadSignature,
  deleteCloudinaryFolder,
  deleteCloudinaryShootAssets,
  getCloudinaryErrorMessage,
  getCloudinaryAbout,
  getCloudinaryCategory,
  getCloudinaryHome,
  getCloudinaryLibrary,
  getCloudinaryPricing,
  getCloudinaryShoot,
  normalizeDollaFolderPath,
  moveCloudinaryShoots,
  renameCloudinaryFolder,
  replaceCloudinaryAboutImage,
  reorderCloudinaryAssets,
  reorderCloudinaryCategories,
  reorderCloudinaryShoots,
  setCloudinaryAboutContent,
  setCloudinaryCategoryDescription,
  setCloudinaryCategoryCover,
  setCloudinaryHomeCarouselAsset,
  setCloudinaryPricingItems,
  setCloudinaryShootCredits,
  setCloudinaryShootCover,
  uploadCloudinaryFile,
}
export type {
  AboutContentBlock,
  CloudinaryAsset,
  CloudinaryAbout,
  CloudinaryConnection,
  CloudinaryFolder,
  CloudinaryCategoryPage,
  CloudinaryHome,
  CloudinaryLibrary,
  CloudinaryPricing,
  CloudinaryShootPage,
  CloudinaryShootSummary,
  PricingItem,
}
