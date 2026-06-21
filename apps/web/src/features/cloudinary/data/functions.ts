import {
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
} from "@/features/cloudinary/data/inputs"
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
  setCloudinaryCategoryDescription,
  setCloudinaryCategoryCover,
  setCloudinaryHomeCarouselAsset,
  setCloudinaryPricingItems,
  setCloudinaryShootCredits,
  setCloudinaryShootCover,
} from "@/lib/cloudinary.server"
import { createServerFn } from "@tanstack/react-start"

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

const setCloudinaryCategoryDescriptionFn = createServerFn({ method: "POST" })
  .inputValidator(setCategoryDescriptionInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return setCloudinaryCategoryDescription(data)
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
  setCloudinaryCategoryDescriptionFn,
  setCloudinaryCategoryCoverFn,
  setCloudinaryHomeCarouselAssetFn,
  setCloudinaryPricingItemsFn,
  setCloudinaryShootCreditsFn,
  setCloudinaryShootCoverFn,
}
