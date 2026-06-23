import { getErrorMessage } from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { ShootPageStateSetters } from "@/features/cloudinary/shoot/_lib/action-types"
import type { CloudinaryShootPage } from "@/lib/cloudinary.server"
import { toast } from "@workspace/ui/lib/toast"

function useShootPageActionRunner({
  setIsBusy,
  setShootPage,
}: Pick<ShootPageStateSetters, "setIsBusy" | "setShootPage">) {
  const performShootAction = useStableCallback(
    async (action: () => Promise<CloudinaryShootPage>) => {
      setIsBusy(true)

      try {
        const nextShootPage = await action()

        setShootPage(nextShootPage)

        if (nextShootPage.connection.error) {
          throw new Error(nextShootPage.connection.error)
        }

        return nextShootPage
      } finally {
        setIsBusy(false)
      }
    }
  )
  const runShootAction = useStableCallback(
    async (
      action: () => Promise<CloudinaryShootPage>,
      successMessage: string
    ) => {
      try {
        await performShootAction(action)

        toast.success(successMessage)
        return true
      } catch (actionError) {
        toast.error(getErrorMessage(actionError))
        return false
      }
    }
  )

  return { performShootAction, runShootAction }
}

export { useShootPageActionRunner }
