import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Trash2Icon } from "lucide-react"
import type { ComponentProps } from "react"

function SelectedPhotosActionBar({
  canDelete,
  isBusy,
  selectedCount,
  onClearSelection,
  onDeleteSelected,
}: {
  canDelete: boolean
  isBusy: boolean
  selectedCount: number
  onClearSelection: () => void
  onDeleteSelected: () => void
}) {
  const renderDeleteTriggerButton = useStableCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={!canDelete || isBusy}
        {...buttonProps}
      />
    )
  )

  return (
    <div className="fixed inset-x-4 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
      <span className="min-w-0 text-sm font-medium">
        {selectedCount} selected
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isBusy}
        onClick={onClearSelection}
      >
        Clear
      </Button>
      <AlertDialog>
        <AlertDialogTrigger render={renderDeleteTriggerButton}>
          <Trash2Icon data-icon="inline-start" />
          Delete
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete selected photos?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} selected photo
              {selectedCount === 1 ? "" : "s"} from Cloudinary and remove the
              synced metadata. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isBusy}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={!canDelete || isBusy}
              onClick={onDeleteSelected}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete photos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export { SelectedPhotosActionBar }
