import { getErrorMessage } from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type {
  GetShootFn,
  RenameFolderFn,
  ShootPageFolders,
  ShootPageStateSetters,
} from "@/features/cloudinary/shoot/_lib/action-types"
import { getMediaShootRoute } from "@/lib/admin-routes"
import type { CloudinaryShootPage } from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import type { AnyRouter } from "@tanstack/react-router"
import { toast } from "@workspace/ui/components/sonner"
import type { FormEvent } from "react"

function useShootPageRenameActions({
  folders,
  getShoot,
  isAdminMode,
  performShootAction,
  renameFolder,
  renameName,
  router,
  setters,
}: {
  folders: ShootPageFolders
  getShoot: GetShootFn
  isAdminMode: boolean
  performShootAction: (
    action: () => Promise<CloudinaryShootPage>
  ) => Promise<CloudinaryShootPage>
  renameFolder: RenameFolderFn
  renameName: string
  router: AnyRouter
  setters: Pick<ShootPageStateSetters, "setIsRenamingShoot" | "setRenameName">
}) {
  const handleRenameShoot = useStableCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!folders.categoryFolder || !folders.shootFolder) {
        return
      }

      const categoryFolder = folders.categoryFolder
      const shootFolder = folders.shootFolder
      const nextName = renameName.trim()

      if (!nextName) {
        return
      }

      if (nextName === shootFolder.name) {
        setters.setIsRenamingShoot(false)
        return
      }

      const renameShootPromise = performShootAction(async () => {
        await renameFolder({
          data: {
            folderPath: shootFolder.path,
            name: nextName,
          },
        })

        return await getShoot({
          data: {
            categoryName: categoryFolder.name,
            shootName: nextName,
          },
        })
      })

      toast.promise(renameShootPromise, {
        loading: "Renaming shoot...",
        success: "Shoot renamed",
        error: (renameError: unknown) => getErrorMessage(renameError),
      })

      void renameShootPromise
        .then(() => {
          setters.setIsRenamingShoot(false)

          void router.navigate({
            to: getMediaShootRoute(isAdminMode),
            params: {
              category: toMediaRouteSegment(categoryFolder.name),
              shoot: toMediaRouteSegment(nextName),
            },
          })

          return undefined
        })
        .catch(() => undefined)
    }
  )

  return {
    cancelRenamingShoot: useStableCallback(() => {
      if (!folders.shootFolder) {
        return
      }

      setters.setRenameName(folders.shootFolder.name)
      setters.setIsRenamingShoot(false)
    }),
    handleRenameShoot,
    startRenamingShoot: useStableCallback(() => {
      if (!folders.shootFolder) {
        return
      }

      setters.setRenameName(folders.shootFolder.name)
      setters.setIsRenamingShoot(true)
    }),
  }
}

export { useShootPageRenameActions }
