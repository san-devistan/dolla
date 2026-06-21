import type { CategoryPageStateSetters } from "@/features/cloudinary/category/_lib/action-types"
import { getErrorMessage } from "@/features/cloudinary/category/_lib/utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryCategoryPage } from "@/lib/cloudinary.server"
import { toast } from "@workspace/ui/components/sonner"

function useCategoryPageActionRunner({
  setCategoryPage,
  setIsBusy,
}: Pick<CategoryPageStateSetters, "setCategoryPage" | "setIsBusy">) {
  const performCategoryAction = useStableCallback(
    async (action: () => Promise<CloudinaryCategoryPage>) => {
      setIsBusy(true)

      try {
        const nextCategoryPage = await action()

        setCategoryPage(nextCategoryPage)

        if (nextCategoryPage.connection.error) {
          throw new Error(nextCategoryPage.connection.error)
        }

        return nextCategoryPage
      } finally {
        setIsBusy(false)
      }
    }
  )
  const runCategoryAction = useStableCallback(
    async (
      action: () => Promise<CloudinaryCategoryPage>,
      successMessage: string
    ) => {
      try {
        await performCategoryAction(action)

        toast.success(successMessage)
        return true
      } catch (actionError) {
        toast.error(getErrorMessage(actionError))
        return false
      }
    }
  )

  return { performCategoryAction, runCategoryAction }
}

export { useCategoryPageActionRunner }
