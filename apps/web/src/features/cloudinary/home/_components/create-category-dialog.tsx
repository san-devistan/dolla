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
import { PlusIcon } from "lucide-react"
import {
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  useCallback,
} from "react"

function CreateCategoryDialog({
  canCreateCategory,
  isBusy,
  newCategoryName,
  open,
  onCreateCategory,
  onNameChange,
  onOpenChange,
}: {
  canCreateCategory: boolean
  isBusy: boolean
  newCategoryName: string
  open: boolean
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void
  onNameChange: (name: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const renderTriggerButton = useCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={!canCreateCategory || isBusy}
        {...buttonProps}
      />
    ),
    [canCreateCategory, isBusy]
  )
  const renderCancelButton = useCallback(
    (buttonProps: ComponentProps<typeof Button>) => (
      <Button type="button" variant="outline" {...buttonProps} />
    ),
    []
  )
  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onNameChange(event.target.value)
    },
    [onNameChange]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={renderTriggerButton}>
        <PlusIcon />
        <span className="sr-only">Create category</span>
      </DialogTrigger>
      <DialogContent>
        <form className="grid gap-5" onSubmit={onCreateCategory}>
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>Dolla project</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-category">Category name</Label>
            <Input
              id="new-category"
              value={newCategoryName}
              placeholder="Category name"
              disabled={!canCreateCategory || isBusy}
              onChange={handleNameChange}
            />
          </div>
          <DialogFooter>
            <DialogClose render={renderCancelButton}>Cancel</DialogClose>
            <Button
              type="submit"
              variant="brand"
              disabled={
                !canCreateCategory || isBusy || newCategoryName.trim() === ""
              }
            >
              <PlusIcon data-icon="inline-start" />
              Add category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { CreateCategoryDialog }
