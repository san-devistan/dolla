import { assertAdminAuthenticated } from "@/lib/admin-auth.server"
import {
  createCloudinaryFolder,
  deleteCloudinaryFolder,
  deleteCloudinaryShootAssets,
  getCloudinaryAbout,
  getCloudinaryCategory,
  getCloudinaryHome,
  getCloudinaryLibrary,
  getCloudinaryPricing,
  getCloudinaryShoot,
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
} from "@/lib/cloudinary.server"
import { createServerFn } from "@tanstack/react-start"

function getStringField(data: unknown, key: string, fallback = "") {
  if (!data || typeof data !== "object") {
    return fallback
  }

  const value = Reflect.get(data, key)

  return typeof value === "string" ? value : fallback
}

function getBooleanField(data: unknown, key: string, fallback = false) {
  if (!data || typeof data !== "object") {
    return fallback
  }

  const value = Reflect.get(data, key)

  return typeof value === "boolean" ? value : fallback
}

const getHomeInput = (data: unknown) => ({
  refresh: getBooleanField(data, "refresh"),
})

const getLibraryInput = (data: unknown) => ({
  folderPath: getStringField(data, "folderPath", "Dolla"),
})

const getCategoryInput = (data: unknown) => ({
  categoryName: getStringField(data, "categoryName"),
  refresh: getBooleanField(data, "refresh"),
})

const getShootInput = (data: unknown) => ({
  categoryName: getStringField(data, "categoryName"),
  refresh: getBooleanField(data, "refresh"),
  shootName: getStringField(data, "shootName"),
})

const createFolderInput = (data: unknown) => ({
  name: getStringField(data, "name"),
  parentPath: getStringField(data, "parentPath", "Dolla"),
})

const renameFolderInput = (data: unknown) => ({
  folderPath: getStringField(data, "folderPath"),
  name: getStringField(data, "name"),
})

const deleteFolderInput = (data: unknown) => ({
  folderPath: getStringField(data, "folderPath"),
})

const deleteAssetsInput = (data: unknown) => ({
  shootPath: getStringField(data, "shootPath"),
  selectedFolder: getStringField(data, "selectedFolder", "Dolla"),
  assetIds: getStringArrayField(data, "assetIds"),
})

const moveShootsInput = (data: unknown) => ({
  selectedFolder: getStringField(data, "selectedFolder", "Dolla"),
  shootPaths: getStringArrayField(data, "shootPaths"),
  targetCategoryPath: getStringField(data, "targetCategoryPath"),
})

function getStringArrayField(data: unknown, key: string) {
  if (!data || typeof data !== "object") {
    return []
  }

  const value = Reflect.get(data, key)

  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === "string")
}

function getNumberField(data: unknown, key: string, fallback = 0) {
  if (!data || typeof data !== "object") {
    return fallback
  }

  const value = Reflect.get(data, key)

  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function getAssetLayoutArrayField(data: unknown, key: string) {
  if (!data || typeof data !== "object") {
    return []
  }

  const value = Reflect.get(data, key)

  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return []
    }

    const assetId = getStringField(item, "assetId")

    if (!assetId) {
      return []
    }

    return [
      {
        assetId,
        layoutColumn: getNumberField(item, "layoutColumn"),
        layoutOrder: getNumberField(item, "layoutOrder"),
        layoutColumnCount: getNumberField(item, "layoutColumnCount", 1),
      },
    ]
  })
}

const reorderShootsInput = (data: unknown) => ({
  categoryPath: getStringField(data, "categoryPath"),
  selectedFolder: getStringField(data, "selectedFolder", "Dolla"),
  shootPaths: getStringArrayField(data, "shootPaths"),
})

const reorderCategoriesInput = (data: unknown) => ({
  categoryPaths: getStringArrayField(data, "categoryPaths"),
})

const reorderAssetsInput = (data: unknown) => ({
  shootPath: getStringField(data, "shootPath"),
  selectedFolder: getStringField(data, "selectedFolder", "Dolla"),
  assetIds: getStringArrayField(data, "assetIds"),
  assetLayouts: getAssetLayoutArrayField(data, "assetLayouts"),
})

const setShootCoverInput = (data: unknown) => ({
  shootPath: getStringField(data, "shootPath"),
  selectedFolder: getStringField(data, "selectedFolder", "Dolla"),
  assetId: getStringField(data, "assetId"),
})

const setHomeCarouselAssetInput = (data: unknown) => ({
  assetId: getStringField(data, "assetId"),
  selected: getBooleanField(data, "selected"),
})

const setShootCreditsInput = (data: unknown) => ({
  shootPath: getStringField(data, "shootPath"),
  credits: getStringField(data, "credits"),
})

function getAboutContentBlocksField(data: unknown, key: string) {
  if (!data || typeof data !== "object") {
    return []
  }

  const value = Reflect.get(data, key)

  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return []
    }

    const kind = Reflect.get(item, "kind")

    if (kind !== "heading" && kind !== "paragraph") {
      return []
    }

    return [
      {
        id: String(Reflect.get(item, "id") || ""),
        kind,
        text: String(Reflect.get(item, "text") || ""),
        bold: Reflect.get(item, "bold") === true,
      },
    ]
  })
}

const setAboutContentInput = (data: unknown) => ({
  blocks: getAboutContentBlocksField(data, "blocks"),
})

function getPricingItemsField(data: unknown, key: string) {
  if (!data || typeof data !== "object") {
    return []
  }

  const value = Reflect.get(data, key)

  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return []
    }

    return [
      {
        id: String(Reflect.get(item, "id") || ""),
        name: String(Reflect.get(item, "name") || ""),
        description: String(Reflect.get(item, "description") || ""),
        price: String(Reflect.get(item, "price") || ""),
      },
    ]
  })
}

const setPricingItemsInput = (data: unknown) => ({
  items: getPricingItemsField(data, "items"),
})

const setCategoryCoverInput = (data: unknown) => ({
  categoryPath: getStringField(data, "categoryPath"),
  selectedFolder: getStringField(data, "selectedFolder", "Dolla"),
  shootPath: getStringField(data, "shootPath"),
})

const getCloudinaryHomeFn = createServerFn({ method: "GET" })
  .inputValidator(getHomeInput)
  .handler(async ({ data }) => getCloudinaryHome({ refresh: data.refresh }))

const getCloudinaryAboutFn = createServerFn({ method: "GET" }).handler(
  async () => getCloudinaryAbout()
)

const getCloudinaryPricingFn = createServerFn({ method: "GET" }).handler(
  async () => getCloudinaryPricing()
)

const getCloudinaryLibraryFn = createServerFn({ method: "GET" })
  .inputValidator(getLibraryInput)
  .handler(async ({ data }) => getCloudinaryLibrary(data.folderPath))

const getCloudinaryCategoryFn = createServerFn({ method: "GET" })
  .inputValidator(getCategoryInput)
  .handler(async ({ data }) =>
    getCloudinaryCategory(data.categoryName, { refresh: data.refresh })
  )

const getCloudinaryShootFn = createServerFn({ method: "GET" })
  .inputValidator(getShootInput)
  .handler(async ({ data }) =>
    getCloudinaryShoot(data.categoryName, data.shootName, {
      refresh: data.refresh,
    })
  )

const createCloudinaryFolderFn = createServerFn({ method: "POST" })
  .inputValidator(createFolderInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return createCloudinaryFolder(data.parentPath, data.name)
  })

const renameCloudinaryFolderFn = createServerFn({ method: "POST" })
  .inputValidator(renameFolderInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return renameCloudinaryFolder(data.folderPath, data.name)
  })

const deleteCloudinaryFolderFn = createServerFn({ method: "POST" })
  .inputValidator(deleteFolderInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return deleteCloudinaryFolder(data.folderPath)
  })

const deleteCloudinaryShootAssetsFn = createServerFn({ method: "POST" })
  .inputValidator(deleteAssetsInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return deleteCloudinaryShootAssets(data)
  })

const moveCloudinaryShootsFn = createServerFn({ method: "POST" })
  .inputValidator(moveShootsInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return moveCloudinaryShoots(data)
  })

const reorderCloudinaryShootsFn = createServerFn({ method: "POST" })
  .inputValidator(reorderShootsInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return reorderCloudinaryShoots(data)
  })

const reorderCloudinaryCategoriesFn = createServerFn({ method: "POST" })
  .inputValidator(reorderCategoriesInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return reorderCloudinaryCategories(data)
  })

const reorderCloudinaryAssetsFn = createServerFn({ method: "POST" })
  .inputValidator(reorderAssetsInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return reorderCloudinaryAssets(data)
  })

const setCloudinaryShootCoverFn = createServerFn({ method: "POST" })
  .inputValidator(setShootCoverInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return setCloudinaryShootCover(data)
  })

const setCloudinaryHomeCarouselAssetFn = createServerFn({ method: "POST" })
  .inputValidator(setHomeCarouselAssetInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return setCloudinaryHomeCarouselAsset(data)
  })

const setCloudinaryShootCreditsFn = createServerFn({ method: "POST" })
  .inputValidator(setShootCreditsInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return setCloudinaryShootCredits(data)
  })

const setCloudinaryAboutContentFn = createServerFn({ method: "POST" })
  .inputValidator(setAboutContentInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return setCloudinaryAboutContent(data)
  })

const setCloudinaryPricingItemsFn = createServerFn({ method: "POST" })
  .inputValidator(setPricingItemsInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return setCloudinaryPricingItems(data)
  })

const setCloudinaryCategoryCoverFn = createServerFn({ method: "POST" })
  .inputValidator(setCategoryCoverInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return setCloudinaryCategoryCover(data)
  })

export {
  createCloudinaryFolderFn,
  deleteCloudinaryFolderFn,
  deleteCloudinaryShootAssetsFn,
  getCloudinaryAboutFn,
  getCloudinaryCategoryFn,
  getCloudinaryHomeFn,
  getCloudinaryLibraryFn,
  getCloudinaryPricingFn,
  getCloudinaryShootFn,
  moveCloudinaryShootsFn,
  renameCloudinaryFolderFn,
  reorderCloudinaryAssetsFn,
  reorderCloudinaryCategoriesFn,
  reorderCloudinaryShootsFn,
  setCloudinaryAboutContentFn,
  setCloudinaryCategoryCoverFn,
  setCloudinaryHomeCarouselAssetFn,
  setCloudinaryPricingItemsFn,
  setCloudinaryShootCreditsFn,
  setCloudinaryShootCoverFn,
}
