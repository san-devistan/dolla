import { v2 as cloudinary } from "cloudinary"
import { randomUUID } from "node:crypto"

import {
  type AboutContentBlock,
  CLOUDINARY_ROOT_FOLDER,
  type CloudinaryAsset,
  type CloudinaryFolderKind,
  type CloudinarySearchBuilder,
  FORBIDDEN_FOLDER_CHARS,
  type LocalEnv,
  SHOOT_FOLDER_KEY_PREFIX,
} from "./part-01"

export function getCloudinaryUploadTimestamp() {
  return String(Math.floor(Date.now() / 1000))
}

export function validateImageFile(file: File) {
  if (file.type && !file.type.toLowerCase().startsWith("image/")) {
    throw new Error("Choose an image file.")
  }
}

export type CloudinaryConfiguredState = {
  configured: true
  cloudName: string
  missingKeys: []
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
}

export type CloudinaryMissingState = {
  configured: false
  cloudName?: string
  missingKeys: string[]
  rootFolder: typeof CLOUDINARY_ROOT_FOLDER
}

export function isDollaFolderPath(folderPath: string) {
  return (
    folderPath === CLOUDINARY_ROOT_FOLDER ||
    folderPath.startsWith(`${CLOUDINARY_ROOT_FOLDER}/`)
  )
}

export function validateFolderSegment(segment: string) {
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

export function createShootFolderKey() {
  return `${SHOOT_FOLDER_KEY_PREFIX}${randomUUID().replaceAll("-", "").slice(0, 12)}`
}

export const localEnvCache: { current: LocalEnv | null } = { current: null }

export function getFolderSearchBuilder(): CloudinarySearchBuilder {
  const candidate = Reflect.get(cloudinary, "search_folders")

  if (
    typeof candidate === "function" &&
    typeof Reflect.get(candidate, "expression") === "function"
  ) {
    return candidate
  }

  throw new Error("The Cloudinary SDK does not expose folder search.")
}

export type CloudinaryFolder = {
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

export type ConvexFolderView = {
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

export type CloudinaryShootSummary = {
  name: string
  path: string
  categoryName: string
  cover?: CloudinaryAsset | null
  assetCount: number
}

export function mapSiteAsset(asset: CloudinaryAsset) {
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

export function dedupeAssets(assets: CloudinaryAsset[]) {
  const assetsById = new Map<string, CloudinaryAsset>()

  for (const asset of assets) {
    assetsById.set(asset.assetId, asset)
  }

  return Array.from(assetsById.values())
}

export const DEFAULT_ABOUT_CONTENT: AboutContentBlock[] = [
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
