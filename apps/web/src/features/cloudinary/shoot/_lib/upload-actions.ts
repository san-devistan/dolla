import { getErrorMessage } from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type {
  GetShootFn,
  ShootPageFolders,
  ShootPageStateSetters,
} from "@/features/cloudinary/shoot/_lib/action-types"
import { uploadAdminCloudinaryFiles } from "@/features/cloudinary/uploads/admin"
import { prepareImageUploadFiles } from "@/features/cloudinary/uploads/image-processing"
import { toast } from "@workspace/ui/lib/toast"
import type { ChangeEvent, RefObject } from "react"

function useShootPageUploadActions({
  folders,
  getShoot,
  setters,
  uploadInputRef,
}: {
  folders: ShootPageFolders
  getShoot: GetShootFn
  setters: Pick<ShootPageStateSetters, "setIsBusy" | "setShootPage">
  uploadInputRef: RefObject<HTMLInputElement | null>
}) {
  const uploadSelectedFiles = useStableCallback(async (files: File[]) => {
    if (!folders.categoryFolder || !folders.shootFolder) {
      return
    }

    if (files.length === 0) {
      toast.error("Choose at least one file to upload.")
      return
    }

    setters.setIsBusy(true)

    try {
      const uploadFiles = await prepareImageUploadFiles(files)

      await uploadAdminCloudinaryFiles({
        files: uploadFiles,
        folderPath: folders.shootFolder.path,
      })

      if (uploadInputRef.current) {
        uploadInputRef.current.value = ""
      }

      const nextShootPage = await getShoot({
        data: {
          categoryName: folders.categoryFolder.name,
          shootName: folders.shootFolder.name,
        },
      })

      setters.setShootPage(nextShootPage)

      if (nextShootPage.connection.error) {
        throw new Error(nextShootPage.connection.error)
      }
    } finally {
      setters.setIsBusy(false)
    }
  })
  const handleUploadFileChange = useStableCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])

      if (files.length === 0) {
        return
      }

      const uploadPromise = uploadSelectedFiles(files)

      toast.promise(uploadPromise, {
        loading:
          files.length === 1
            ? "Preparing and uploading photo..."
            : `Preparing and uploading ${files.length} photos...`,
        success: files.length === 1 ? "Photo uploaded" : "Photos uploaded",
        error: (uploadError: unknown) => getErrorMessage(uploadError),
      })

      void uploadPromise.catch(() => undefined)
    }
  )

  return {
    handleUploadClick: useStableCallback(() => {
      uploadInputRef.current?.click()
    }),
    handleUploadFileChange,
  }
}

export { useShootPageUploadActions }
