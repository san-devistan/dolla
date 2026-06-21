import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryCategoryPage } from "@/lib/cloudinary.server"
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
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { FolderInputIcon, Trash2Icon } from "lucide-react"
import type { ComponentProps, FormEvent } from "react"

type SelectedShootsActionMode = {
  canDelete: boolean
  canMove: boolean
  isBusy: boolean
}

function SelectedShootsActionBar({
  availableTargetCategories,
  mode,
  moveTargetCategoryPath,
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onMoveSelected,
  onMoveTargetCategoryPathChange,
}: {
  availableTargetCategories: CloudinaryCategoryPage["categories"]
  mode: SelectedShootsActionMode
  moveTargetCategoryPath: string
  selectedCount: number
  onClearSelection: () => void
  onDeleteSelected: () => void
  onMoveSelected: () => void
  onMoveTargetCategoryPathChange: (categoryPath: string) => void
}) {
  return (
    <div className="fixed inset-x-4 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-3 border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
      <span className="min-w-0 text-sm font-medium">
        {selectedCount} selected
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={mode.isBusy}
        onClick={onClearSelection}
      >
        Clear
      </Button>
      <MoveShootsDialog
        availableTargetCategories={availableTargetCategories}
        mode={mode}
        moveTargetCategoryPath={moveTargetCategoryPath}
        selectedCount={selectedCount}
        onMoveSelected={onMoveSelected}
        onMoveTargetCategoryPathChange={onMoveTargetCategoryPathChange}
      />
      <DeleteShootsDialog
        mode={mode}
        selectedCount={selectedCount}
        onDeleteSelected={onDeleteSelected}
      />
    </div>
  )
}

function MoveShootsDialog({
  availableTargetCategories,
  mode,
  moveTargetCategoryPath,
  selectedCount,
  onMoveSelected,
  onMoveTargetCategoryPathChange,
}: {
  availableTargetCategories: CloudinaryCategoryPage["categories"]
  mode: SelectedShootsActionMode
  moveTargetCategoryPath: string
  selectedCount: number
  onMoveSelected: () => void
  onMoveTargetCategoryPathChange: (categoryPath: string) => void
}) {
  const renderMoveTriggerButton = useStableCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!mode.canMove || mode.isBusy}
        {...buttonProps}
      />
    )
  )
  const renderCancelButton = useStableCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button type="button" variant="outline" {...buttonProps} />
    )
  )
  const handleMoveSubmit = useStableCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      onMoveSelected()
    }
  )
  const handleMoveTargetChange = useStableCallback((value: string | null) => {
    if (value) {
      onMoveTargetCategoryPathChange(value)
    }
  })

  return (
    <Dialog>
      <DialogTrigger render={renderMoveTriggerButton}>
        <FolderInputIcon data-icon="inline-start" />
        Move
      </DialogTrigger>
      <DialogContent>
        <form className="grid gap-5" onSubmit={handleMoveSubmit}>
          <DialogHeader>
            <DialogTitle>Move selected shoots</DialogTitle>
            <DialogDescription>
              Choose the category that should receive {selectedCount} shoot
              {selectedCount === 1 ? "" : "s"}.
            </DialogDescription>
          </DialogHeader>
          <MoveShootsCategorySelect
            availableTargetCategories={availableTargetCategories}
            mode={mode}
            moveTargetCategoryPath={moveTargetCategoryPath}
            onMoveTargetCategoryPathChange={handleMoveTargetChange}
          />
          <DialogFooter>
            <DialogClose render={renderCancelButton}>Cancel</DialogClose>
            <Button
              type="submit"
              variant="brand"
              disabled={!mode.canMove || mode.isBusy}
            >
              <FolderInputIcon data-icon="inline-start" />
              Move shoots
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MoveShootsCategorySelect({
  availableTargetCategories,
  mode,
  moveTargetCategoryPath,
  onMoveTargetCategoryPathChange,
}: {
  availableTargetCategories: CloudinaryCategoryPage["categories"]
  mode: SelectedShootsActionMode
  moveTargetCategoryPath: string
  onMoveTargetCategoryPathChange: (value: string | null) => void
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="move-shoots-category">Category</Label>
      <Select
        value={moveTargetCategoryPath}
        onValueChange={onMoveTargetCategoryPathChange}
      >
        <SelectTrigger
          id="move-shoots-category"
          className="w-full"
          disabled={!mode.canMove || mode.isBusy}
        >
          <SelectValue placeholder="Choose category" />
        </SelectTrigger>
        <SelectContent align="start">
          {availableTargetCategories.map((category) => (
            <SelectItem key={category.path} value={category.path}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function DeleteShootsDialog({
  mode,
  selectedCount,
  onDeleteSelected,
}: {
  mode: SelectedShootsActionMode
  selectedCount: number
  onDeleteSelected: () => void
}) {
  const renderDeleteTriggerButton = useStableCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={!mode.canDelete || mode.isBusy}
        {...buttonProps}
      />
    )
  )

  return (
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
          <AlertDialogTitle>Delete selected shoots?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes {selectedCount} selected shoot
            {selectedCount === 1 ? "" : "s"} and their Cloudinary files.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost" disabled={mode.isBusy}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={!mode.canDelete || mode.isBusy}
            onClick={onDeleteSelected}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete shoots
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { SelectedShootsActionBar }
export type { SelectedShootsActionMode }
