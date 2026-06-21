import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryFolder } from "@/lib/cloudinary.server"
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

function DeleteShootDialog({
  canDeleteShoot,
  isBusy,
  shoot,
  onDeleteShoot,
}: {
  canDeleteShoot: boolean
  isBusy: boolean
  shoot: CloudinaryFolder
  onDeleteShoot: () => void
}) {
  const renderDeleteTriggerButton = useStableCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        disabled={!canDeleteShoot || isBusy}
        {...buttonProps}
      />
    )
  )

  return (
    <AlertDialog>
      <AlertDialogTrigger render={renderDeleteTriggerButton}>
        <Trash2Icon />
        <span className="sr-only">Delete shoot</span>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete shoot?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes &quot;{shoot.name}&quot; and its Cloudinary
            files.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" disabled={isBusy}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={!canDeleteShoot || isBusy}
            onClick={onDeleteShoot}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete shoot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { DeleteShootDialog }
