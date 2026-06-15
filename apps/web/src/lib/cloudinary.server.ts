import { mediaRouteSegmentMatchesName } from "@/lib/media-route-segment"
import { api } from "@workspace/backend/api"
import { v2 as cloudinary } from "cloudinary"
import { ConvexHttpClient } from "convex/browser"
import { Buffer } from "node:buffer"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const CLOUDINARY_ROOT_FOLDER = "Dolla"
const FORBIDDEN_FOLDER_CHARS = /[?&#\\%<>+]/
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
  created_at?: string
  context?: object
}

type CloudinarySearchBuilder = typeof cloudinary.search

type CloudinaryRawFolder = {
  name?: string
  path?: string
  created_at?: string
  updated_at?: string
  external_id?: string
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
  credits?: string
  createdAt?: string
  updatedAt?: string
  externalId?: string
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
  createdAt?: string
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
  createdAt: string | null
  updatedAt: string | null
  externalId: string | null
  orderRank: number
  coverShootPath: string | null
  coverAssetId: string | null
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
  createdAt: string | null
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
}

type CloudinaryReadOptions = {
  refresh?: boolean
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
  const kind =
    depth === 0
      ? "root"
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
    displayPath: segments.slice(1).join(" / ") || "Project",
  } satisfies {
    folderPath: string
    segments: string[]
    depth: number
    kind: CloudinaryFolderKind
    categoryName?: string
    shootName?: string
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

function buildChildFolderPath(parentPath: string, name: string) {
  const normalizedParentPath = normalizeDollaFolderPath(parentPath)
  const parentInfo = getFolderInfo(normalizedParentPath)

  if (parentInfo.depth > 1) {
    throw new Error(
      "Create categories under the project or shoots under a category."
    )
  }

  return `${normalizedParentPath}/${normalizeFolderName(name)}`
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

function renameDollaFolderPath(folderPath: string, name: string) {
  const normalizedPath = normalizeDollaFolderPath(folderPath)
  const folderInfo = getFolderInfo(normalizedPath)

  if (normalizedPath === CLOUDINARY_ROOT_FOLDER) {
    throw new Error("The Dolla root folder cannot be renamed.")
  }

  if (folderInfo.kind === "nested") {
    throw new Error("Only category and shoot folders can be renamed.")
  }

  const parentPath = normalizedPath.split("/").slice(0, -1).join("/")

  return `${parentPath}/${normalizeFolderName(name)}`
}

function readRawFolder(value: unknown): CloudinaryRawFolder | null {
  const folderPath = readString(value, "path")

  if (!folderPath) {
    return null
  }

  return {
    name: readString(value, "name"),
    path: folderPath,
    created_at: readString(value, "created_at"),
    updated_at: readString(value, "updated_at"),
    external_id: readString(value, "external_id"),
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
    created_at: readString(value, "created_at"),
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
    parentPath:
      folderInfo.segments.length > 1
        ? folderInfo.segments.slice(0, -1).join("/")
        : null,
    categoryName: folderInfo.categoryName,
    shootName: folderInfo.shootName,
    createdAt: folder.created_at,
    updatedAt: folder.updated_at,
    externalId: folder.external_id,
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
    createdAt: asset.created_at,
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
    credits: folder.credits || undefined,
    createdAt: folder.createdAt || undefined,
    updatedAt: folder.updatedAt || undefined,
    externalId: folder.externalId || undefined,
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
    createdAt: asset.createdAt || undefined,
    context: asset.context,
    orderRank: asset.orderRank,
    layoutColumn: asset.layoutColumn ?? undefined,
    layoutOrder: asset.layoutOrder ?? undefined,
    layoutColumnCount: asset.layoutColumnCount ?? undefined,
    homeCarouselOrderRank: asset.homeCarouselOrderRank ?? undefined,
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
    createdAt: folder.createdAt || null,
    updatedAt: folder.updatedAt || null,
    externalId: folder.externalId || null,
  }
}

function mapSyncAsset(asset: CloudinaryAsset) {
  const folderInfo = getFolderInfo(asset.folder)

  if (
    folderInfo.kind !== "shoot" ||
    !folderInfo.categoryName ||
    !folderInfo.shootName
  ) {
    return null
  }

  return {
    assetId: asset.assetId,
    publicId: asset.publicId,
    folder: asset.folder,
    categoryPath: `${CLOUDINARY_ROOT_FOLDER}/${folderInfo.categoryName}`,
    shootPath: asset.folder,
    categoryName: folderInfo.categoryName,
    shootName: folderInfo.shootName,
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
    createdAt: asset.createdAt || null,
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
      .filter((folder) => folder.kind === "category" || folder.kind === "shoot")
      .map(mapSyncFolder),
    assets: assets
      .map(mapSyncAsset)
      .filter((asset): asset is NonNullable<typeof asset> => asset !== null),
    markMissingFolders,
    assetFolderPaths,
    syncedAt: Date.now(),
  })
}

function getShootFolderPaths(folders: CloudinaryFolder[]) {
  return folders
    .filter((folder) => folder.kind === "shoot")
    .map((folder) => folder.path)
}

async function searchDollaShootAssets(folders: CloudinaryFolder[]) {
  const shootFolderPaths = getShootFolderPaths(folders)

  if (shootFolderPaths.length === 0) {
    return []
  }

  return await searchAssetsInFolders({
    folderPaths: shootFolderPaths,
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
    assetFolderPaths: getShootFolderPaths(folders),
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
    categoryPage.shoots.length > 0
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

function sortFoldersForDeletion(folders: CloudinaryFolder[]) {
  const sortedFolders = folders.slice()

  sortedFolders.sort((first, second) => {
    if (first.depth !== second.depth) {
      return second.depth - first.depth
    }

    return second.path.localeCompare(first.path, undefined, {
      sensitivity: "base",
    })
  })

  return sortedFolders
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

async function searchDollaFolders(): Promise<CloudinaryFolder[]> {
  const response = await getFolderSearchBuilder()
    .expression(`path:${CLOUDINARY_ROOT_FOLDER}*`)
    .max_results(500)
    .execute()
  const folders = readArray(response, "folders")
    .map(readRawFolder)
    .filter((folder): folder is CloudinaryRawFolder => folder !== null)
    .filter((folder) => isDollaFolderPath(folder.path || ""))
    .map(mapFolder)

  return sortFolders(ensureRootFolder(folders))
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

async function getCloudinaryLibrary(
  folderPath = CLOUDINARY_ROOT_FOLDER
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

    const folders = await searchDollaFolders()
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
        assetFolderPaths:
          getFolderInfo(selectedFolder).kind === "shoot"
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
    const syncedAssets = await searchDollaShootAssets(folders)
    const latestAssets = syncedAssets.slice(0, HOME_LATEST_ASSET_LIMIT)
    const categoryFolders = folders.filter((folder) => folder.depth === 1)
    const categories = categoryFolders.map((folder) => {
      const shootCount = new Set(
        folders
          .filter((candidate) => candidate.parentPath === folder.path)
          .map((candidate) => candidate.path)
      ).size

      return {
        name: folder.name,
        path: folder.path,
        orderRank: folder.orderRank,
        cover: findCategoryCoverAsset(syncedAssets, folder.path),
        shootCount,
      }
    })

    const directHome = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories,
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
  const [categories, content] = await Promise.all([
    readConvexCategoryNavigation(),
    readAboutContent(),
  ])

  if (!connectionState.configured) {
    return {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      categories,
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

      return {
        name: folder.name,
        path: folder.path,
        orderRank: folder.orderRank,
        cover: findCategoryCoverAsset(latestAssets, folder.path),
        shootCount,
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

function getCategoryShootFolders(
  folders: CloudinaryFolder[],
  category: CloudinaryFolder | undefined
) {
  if (!category) {
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
    const syncedAssets = await searchDollaShootAssets(folders)
    const categoryAssets = category
      ? syncedAssets.filter((asset) =>
          isSameOrChildFolder(asset.folder, category.path)
        )
      : []

    const directCategoryPage = {
      connection: connectionState,
      rootFolder: CLOUDINARY_ROOT_FOLDER,
      category,
      categories: getCategorySummaries(folders, syncedAssets),
      shoots: getShootSummaries({ assets: categoryAssets, shoots }),
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
    const syncedAssets = await searchDollaShootAssets(folders)
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
  configureCloudinary()

  const folderPath = buildChildFolderPath(parentPath, name)
  const folderInfo = getFolderInfo(folderPath)

  if (folderInfo.kind !== "category" && folderInfo.kind !== "shoot") {
    throw new Error("Only category and shoot folders can be created.")
  }

  await cloudinary.api.create_folder(folderPath)

  return getCloudinaryLibrary(folderPath)
}

async function renameCloudinaryFolder(folderPath: string, name: string) {
  configureCloudinary()

  const fromFolder = normalizeDollaFolderPath(folderPath)
  const toFolder = renameDollaFolderPath(fromFolder, name)

  await cloudinary.api.rename_folder(fromFolder, toFolder)

  return getCloudinaryLibrary(toFolder)
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
  configureCloudinary()

  const normalizedSelectedFolder = normalizeDollaFolderPath(selectedFolder)
  const normalizedTargetCategoryPath =
    normalizeDollaFolderPath(targetCategoryPath)
  const targetCategoryInfo = getFolderInfo(normalizedTargetCategoryPath)
  const normalizedShootPaths = getUniqueFolderPaths(shootPaths)

  if (targetCategoryInfo.kind !== "category") {
    throw new Error("Move shoots into a category folder.")
  }

  if (normalizedShootPaths.length === 0) {
    throw new Error("Select at least one shoot to move.")
  }

  const foldersBeforeMove = await searchDollaFolders()
  const targetCategory = foldersBeforeMove.find(
    (folder) =>
      folder.kind === "category" && folder.path === normalizedTargetCategoryPath
  )

  if (!targetCategory) {
    throw new Error("Target category not found.")
  }

  const selectedShootPathSet = new Set(normalizedShootPaths)
  const moves = normalizedShootPaths.map((shootPath) => {
    const shoot = foldersBeforeMove.find((folder) => folder.path === shootPath)

    if (!shoot || shoot.kind !== "shoot") {
      throw new Error("Selected shoots must be existing shoot folders.")
    }

    if (shoot.parentPath === targetCategory.path) {
      throw new Error("Choose a different category for the selected shoots.")
    }

    return {
      fromPath: shoot.path,
      toPath: buildShootFolderPathForCategoryPath(
        targetCategory.path,
        shoot.name
      ),
    }
  })
  const targetShootPaths = new Set<string>()

  for (const move of moves) {
    if (targetShootPaths.has(move.toPath)) {
      throw new Error("Selected shoots must have unique names.")
    }

    targetShootPaths.add(move.toPath)
  }

  const conflictingShoot = foldersBeforeMove.find(
    (folder) =>
      folder.kind === "shoot" &&
      targetShootPaths.has(folder.path) &&
      !selectedShootPathSet.has(folder.path)
  )

  if (conflictingShoot) {
    throw new Error(
      `"${conflictingShoot.name}" already exists in ${targetCategory.name}.`
    )
  }

  await Promise.all(
    moves.map((move) =>
      cloudinary.api.rename_folder(move.fromPath, move.toPath)
    )
  )

  const movedShootPaths = moves.map((move) => move.toPath)
  const foldersAfterMove = await searchDollaFolders()
  const movedAssets = await searchAssetsInFolders({
    folderPaths: movedShootPaths,
    imageOnly: true,
  })
  const convexClient = getConvexMediaClient()

  if (convexClient) {
    await syncCloudinaryMetadata({
      client: convexClient,
      folders: foldersAfterMove,
      assets: movedAssets,
      markMissingFolders: true,
      assetFolderPaths: [
        ...moves.map((move) => move.fromPath),
        ...movedShootPaths,
      ],
    })
    await convexClient.mutation(api.media.preserveMovedShootMetadata, {
      moves,
    })
  }

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

async function syncDeletedCloudinaryFolders(shootFolderPaths: string[]) {
  const convexClient = getConvexMediaClient()

  if (!convexClient) {
    return
  }

  await syncCloudinaryMetadata({
    client: convexClient,
    folders: await searchDollaFolders(),
    assets: [],
    markMissingFolders: true,
    assetFolderPaths: shootFolderPaths,
  })
}

async function deleteCloudinaryFolder(folderPath: string) {
  configureCloudinary()

  const normalizedPath = normalizeDollaFolderPath(folderPath)
  const folderInfo = getFolderInfo(normalizedPath)

  if (normalizedPath === CLOUDINARY_ROOT_FOLDER) {
    throw new Error("The Dolla root folder cannot be deleted.")
  }

  if (folderInfo.kind !== "category" && folderInfo.kind !== "shoot") {
    throw new Error("Only category and shoot folders can be deleted.")
  }

  const parentPath = normalizedPath.split("/").slice(0, -1).join("/")
  const folders = await searchDollaFolders()
  const foldersToDelete = folders.filter((folder) =>
    isSameOrChildFolder(folder.path, normalizedPath)
  )

  if (!foldersToDelete.some((folder) => folder.path === normalizedPath)) {
    throw new Error("Folder not found.")
  }

  const shootFolderPaths = foldersToDelete
    .filter((folder) => folder.kind === "shoot")
    .map((folder) => folder.path)
  const assets = await searchAssetsInFolders({
    folderPaths: foldersToDelete.map((folder) => folder.path),
    imageOnly: false,
  })

  await deleteCloudinaryAssets(assets)

  for (const folder of sortFoldersForDeletion(foldersToDelete)) {
    await cloudinary.api.delete_folder(folder.path)
  }

  await syncDeletedCloudinaryFolders(shootFolderPaths)

  return getCloudinaryLibrary(parentPath || CLOUDINARY_ROOT_FOLDER)
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

  const normalizedShootPath = normalizeDollaFolderPath(shootPath)
  const folderInfo = getFolderInfo(normalizedShootPath)
  const selectedAssetIds = Array.from(
    new Set(assetIds.map((assetId) => assetId.trim()).filter(Boolean))
  )

  if (folderInfo.kind !== "shoot") {
    throw new Error("Photos can only be deleted from a shoot folder.")
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

  const selectedFolder = normalizeDollaFolderPath(folderPath)
  const folderInfo = getFolderInfo(selectedFolder)

  if (folderInfo.kind !== "shoot") {
    throw new Error("Upload photos into a shoot folder.")
  }

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

  const asset = mapAsset(result)
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
  const normalizedShootPath = normalizeDollaFolderPath(shootPath)

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

  return "Cloudinary request failed."
}

export {
  CLOUDINARY_ROOT_FOLDER,
  createCloudinaryFolder,
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
  reorderCloudinaryAssets,
  reorderCloudinaryCategories,
  reorderCloudinaryShoots,
  setCloudinaryAboutContent,
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
