import {
  getErrorMessage,
  getInlineCreditText,
} from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type {
  GetShootFn,
  SetShootCreditsFn,
  ShootPageFolders,
  ShootPageStateSetters,
} from "@/features/cloudinary/shoot/_lib/action-types"
import type { CloudinaryShootPage } from "@/lib/cloudinary.server"
import { toast } from "@workspace/ui/components/sonner"
import type { FormEvent } from "react"

function useShootPageCreditActions({
  creditsDraft,
  folders,
  getShoot,
  performShootAction,
  setShootCredits,
  setters,
}: {
  creditsDraft: string
  folders: ShootPageFolders
  getShoot: GetShootFn
  performShootAction: (
    action: () => Promise<CloudinaryShootPage>
  ) => Promise<CloudinaryShootPage>
  setShootCredits: SetShootCreditsFn
  setters: Pick<
    ShootPageStateSetters,
    "setCreditsDraft" | "setIsEditingCredits"
  >
}) {
  const handleSaveCredits = useStableCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!folders.categoryFolder || !folders.shootFolder) {
        return
      }

      const categoryFolder = folders.categoryFolder
      const shootFolder = folders.shootFolder
      const nextCredits = getInlineCreditText(creditsDraft)

      if (nextCredits === getInlineCreditText(shootFolder.credits || "")) {
        setters.setIsEditingCredits(false)
        return
      }

      const saveCreditsPromise = performShootAction(async () => {
        await setShootCredits({
          data: {
            shootPath: shootFolder.path,
            credits: nextCredits,
          },
        })

        return await getShoot({
          data: {
            categoryName: categoryFolder.name,
            shootName: shootFolder.name,
          },
        })
      })

      toast.promise(saveCreditsPromise, {
        loading: "Saving credits...",
        success: nextCredits ? "Credits saved" : "Credits cleared",
        error: (creditsError) => getErrorMessage(creditsError),
      })

      void saveCreditsPromise
        .then(() => {
          setters.setIsEditingCredits(false)

          return undefined
        })
        .catch(() => undefined)
    }
  )

  return {
    cancelEditingCredits: useStableCallback(() => {
      if (!folders.shootFolder) {
        return
      }

      setters.setCreditsDraft(folders.shootFolder.credits || "")
      setters.setIsEditingCredits(false)
    }),
    handleSaveCredits,
    startEditingCredits: useStableCallback(() => {
      if (!folders.shootFolder) {
        return
      }

      setters.setCreditsDraft(folders.shootFolder.credits || "")
      setters.setIsEditingCredits(true)
    }),
  }
}

export { useShootPageCreditActions }
