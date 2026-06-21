import { getEditableCategoryDescription } from "@/features/cloudinary/category/_lib/utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryFolder } from "@/lib/cloudinary.server"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { CheckIcon, XIcon } from "lucide-react"
import type { ChangeEvent } from "react"

type CategoryDescriptionMode =
  | {
      type: "admin"
      canEditDescription: boolean
      canSaveEdit: boolean
      isBusy: boolean
      isEditing: boolean
    }
  | {
      type: "public"
    }

function CategoryDescription({
  category,
  descriptionDraft,
  mode,
  onCancelEdit,
  onDescriptionDraftChange,
}: {
  category: CloudinaryFolder
  descriptionDraft: string
  mode: CategoryDescriptionMode
  onCancelEdit: () => void
  onDescriptionDraftChange: (description: string) => void
}) {
  const description = getEditableCategoryDescription(category)
  const hasDescription = description.length > 0
  const shouldShowEditor = mode.type === "admin" && mode.isEditing
  const handleDescriptionDraftChange = useStableCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onDescriptionDraftChange(event.target.value)
    }
  )

  if (!hasDescription && !shouldShowEditor) {
    return null
  }

  if (shouldShowEditor) {
    return (
      <div className="mt-3 flex w-full items-start gap-3">
        <Textarea
          id="category-description"
          aria-label="Category description"
          value={descriptionDraft}
          disabled={!mode.canEditDescription || mode.isBusy}
          maxLength={2000}
          placeholder="Description (optional)"
          className="min-h-20 min-w-0 flex-1 py-2 font-sans text-sm leading-relaxed text-muted-foreground md:text-base"
          onChange={handleDescriptionDraftChange}
        />
        <CategoryEditActions
          canSave={mode.canSaveEdit}
          isBusy={mode.isBusy}
          onCancel={onCancelEdit}
        />
      </div>
    )
  }

  return (
    <div className="mt-3 flex w-full flex-wrap items-start gap-x-2 gap-y-1">
      <p className="min-w-0 flex-1 font-sans text-sm leading-relaxed text-muted-foreground md:text-base">
        {description}
      </p>
    </div>
  )
}

function CategoryEditActions({
  canSave,
  isBusy,
  onCancel,
}: {
  canSave: boolean
  isBusy: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button type="submit" size="icon" disabled={!canSave}>
        <CheckIcon />
        <span className="sr-only">Save category</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={isBusy}
        onClick={onCancel}
      >
        <XIcon />
        <span className="sr-only">Cancel category edit</span>
      </Button>
    </div>
  )
}

export { CategoryDescription, CategoryEditActions }
export type { CategoryDescriptionMode }
