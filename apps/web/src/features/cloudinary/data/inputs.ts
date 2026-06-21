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

const setAboutContentInput = (data: unknown) => ({
  blocks: getAboutContentBlocksField(data, "blocks"),
})

const setPricingItemsInput = (data: unknown) => ({
  items: getPricingItemsField(data, "items"),
})

const setCategoryCoverInput = (data: unknown) => ({
  categoryPath: getStringField(data, "categoryPath"),
  selectedFolder: getStringField(data, "selectedFolder", "Dolla"),
  shootPath: getStringField(data, "shootPath"),
})

const setCategoryDescriptionInput = (data: unknown) => ({
  categoryPath: getStringField(data, "categoryPath"),
  description: getStringField(data, "description"),
})

export {
  createFolderInput,
  deleteAssetsInput,
  deleteFolderInput,
  getCategoryInput,
  getHomeInput,
  getLibraryInput,
  getShootInput,
  moveShootsInput,
  renameFolderInput,
  reorderAssetsInput,
  reorderCategoriesInput,
  reorderShootsInput,
  setAboutContentInput,
  setCategoryCoverInput,
  setCategoryDescriptionInput,
  setHomeCarouselAssetInput,
  setPricingItemsInput,
  setShootCoverInput,
  setShootCreditsInput,
}
