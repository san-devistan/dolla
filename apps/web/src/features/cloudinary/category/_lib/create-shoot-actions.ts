import type {
  CategoryPageActionState,
  CreateFolderFn,
  GetCategoryFn,
} from "@/features/cloudinary/category/_lib/action-types"
import { getErrorMessage } from "@/features/cloudinary/category/_lib/utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import { uploadAdminCloudinaryFiles } from "@/features/cloudinary/uploads/admin"
import { prepareImageUploadFiles } from "@/features/cloudinary/uploads/image-processing"
import { getMediaShootRoute } from "@/lib/admin-routes"
import type { CloudinaryCategoryPage } from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import type { AnyRouter } from "@tanstack/react-router"
import { toast } from "@workspace/ui/lib/toast"
import type { ChangeEvent, FormEvent } from "react"

function useCategoryPageCreateShootActions({
  createFolder,
  getCategory,
  isAdminMode,
  performCategoryAction,
  router,
  state,
}: {
  createFolder: CreateFolderFn
  getCategory: GetCategoryFn
  isAdminMode: boolean
  performCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>
  ) => Promise<CloudinaryCategoryPage>
  router: AnyRouter
  state: CategoryPageActionState
}) {
  return {
    handleCreateShoot: useCreateShoot({
      createFolder,
      getCategory,
      isAdminMode,
      performCategoryAction,
      router,
      state,
    }),
    handleCreateShootDialogOpenChange: useStableCallback((open: boolean) => {
      state.setIsCreateShootDialogOpen(open)

      if (!open) {
        state.setCreateShootName("")
        state.setCreateShootFiles([])
      }
    }),
    handleCreateShootFilesChange: useStableCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        state.setCreateShootFiles(Array.from(event.target.files || []))
      }
    ),
  }
}

function useCreateShoot({
  createFolder,
  getCategory,
  isAdminMode,
  performCategoryAction,
  router,
  state,
}: {
  createFolder: CreateFolderFn
  getCategory: GetCategoryFn
  isAdminMode: boolean
  performCategoryAction: (
    action: () => Promise<CloudinaryCategoryPage>
  ) => Promise<CloudinaryCategoryPage>
  router: AnyRouter
  state: CategoryPageActionState
}) {
  return useStableCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!state.selectedCategory) {
      toast.error("Select a category before adding shoots.")
      return
    }

    const nextShootName = state.createShootName.trim()

    if (!nextShootName) {
      return
    }

    const selectedCategory = state.selectedCategory
    const createShootPromise = performCategoryAction(async () => {
      const createdShootLibrary = await createFolder({
        data: {
          name: nextShootName,
          parentPath: selectedCategory.path,
        },
      })

      if (state.createShootFiles.length > 0) {
        await uploadFilesToShoot(
          createdShootLibrary.selectedFolder,
          state.createShootFiles
        )
      }

      return await getCategory({
        data: { categoryName: selectedCategory.name },
      })
    })

    toast.promise(createShootPromise, {
      loading:
        state.createShootFiles.length > 0
          ? "Creating shoot and uploading photos..."
          : "Creating shoot...",
      success: "Shoot created",
      error: (createError: unknown) => getErrorMessage(createError),
    })

    void createShootPromise
      .then(() => {
        state.setCreateShootName("")
        state.setCreateShootFiles([])
        state.setIsCreateShootDialogOpen(false)

        void router.navigate({
          to: getMediaShootRoute(isAdminMode),
          params: {
            category: toMediaRouteSegment(selectedCategory.name),
            shoot: toMediaRouteSegment(nextShootName),
          },
        })

        return undefined
      })
      .catch(() => undefined)
  })
}

async function uploadFilesToShoot(shootPath: string, files: File[]) {
  const uploadFiles = await prepareImageUploadFiles(files)

  await uploadAdminCloudinaryFiles({
    files: uploadFiles,
    folderPath: shootPath,
  })
}

export { useCategoryPageCreateShootActions }
