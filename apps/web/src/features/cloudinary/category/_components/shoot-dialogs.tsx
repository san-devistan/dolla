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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { PlusIcon, Trash2Icon } from "lucide-react"
import type { ChangeEvent, ComponentProps, FormEvent } from "react"

function CreateShootDialog({
  canCreateShoot,
  createShootFiles,
  createShootName,
  isBusy,
  open,
  selectedCategoryName,
  onCreateShoot,
  onFilesChange,
  onNameChange,
  onOpenChange,
}: {
  canCreateShoot: boolean
  createShootFiles: File[]
  createShootName: string
  isBusy: boolean
  open: boolean
  selectedCategoryName: string
  onCreateShoot: (event: FormEvent<HTMLFormElement>) => void
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void
  onNameChange: (name: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const renderTriggerButton = useStableCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={!canCreateShoot || isBusy}
        {...buttonProps}
      />
    )
  )
  const renderCancelButton = useStableCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button type="button" variant="outline" {...buttonProps} />
    )
  )
  const handleNameChange = useStableCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onNameChange(event.target.value)
    }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={renderTriggerButton}>
        <PlusIcon />
        <span className="sr-only">Create shoot</span>
      </DialogTrigger>
      <DialogContent>
        <form className="grid gap-5" onSubmit={onCreateShoot}>
          <DialogHeader>
            <DialogTitle>New shoot</DialogTitle>
            <DialogDescription>{selectedCategoryName}</DialogDescription>
          </DialogHeader>
          <CreateShootFields
            canCreateShoot={canCreateShoot}
            createShootFiles={createShootFiles}
            createShootName={createShootName}
            isBusy={isBusy}
            onFilesChange={onFilesChange}
            onNameChange={handleNameChange}
          />
          <DialogFooter>
            <DialogClose render={renderCancelButton}>Cancel</DialogClose>
            <Button
              type="submit"
              variant="brand"
              disabled={
                !canCreateShoot || isBusy || createShootName.trim() === ""
              }
            >
              <PlusIcon data-icon="inline-start" />
              Create shoot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateShootFields({
  canCreateShoot,
  createShootFiles,
  createShootName,
  isBusy,
  onFilesChange,
  onNameChange,
}: {
  canCreateShoot: boolean
  createShootFiles: File[]
  createShootName: string
  isBusy: boolean
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="new-shoot">Shoot name</Label>
        <Input
          id="new-shoot"
          value={createShootName}
          placeholder="Shoot name"
          disabled={!canCreateShoot || isBusy}
          onChange={onNameChange}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-shoot-files">Photos</Label>
        <Input
          id="new-shoot-files"
          type="file"
          accept="image/*"
          multiple
          disabled={!canCreateShoot || isBusy}
          onChange={onFilesChange}
        />
        <p className="text-xs text-muted-foreground">
          {createShootFiles.length === 0
            ? "No photos selected"
            : `${createShootFiles.length} photo${
                createShootFiles.length === 1 ? "" : "s"
              } selected`}
        </p>
      </div>
    </div>
  )
}

function DeleteCategoryDialog({
  canDeleteCategory,
  category,
  isBusy,
  onDeleteCategory,
}: {
  canDeleteCategory: boolean
  category: CloudinaryFolder
  isBusy: boolean
  onDeleteCategory: () => void
}) {
  const renderDeleteTriggerButton = useStableCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        disabled={!canDeleteCategory || isBusy}
        {...buttonProps}
      />
    )
  )

  return (
    <AlertDialog>
      <AlertDialogTrigger render={renderDeleteTriggerButton}>
        <Trash2Icon />
        <span className="sr-only">Remove category</span>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete category?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes &quot;{category.name}&quot; and every shoot inside it
            from the site, including their Cloudinary files.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" disabled={isBusy}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={!canDeleteCategory || isBusy}
            onClick={onDeleteCategory}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete category
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { CreateShootDialog, DeleteCategoryDialog }
