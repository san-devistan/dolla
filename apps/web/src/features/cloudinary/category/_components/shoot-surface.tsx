import {
  CategoryDescription,
  type CategoryDescriptionMode,
  CategoryEditActions,
} from "@/features/cloudinary/category/_components/description"
import {
  CreateShootDialog,
  DeleteCategoryDialog,
} from "@/features/cloudinary/category/_components/shoot-dialogs"
import { CategoryShootGrid } from "@/features/cloudinary/category/_components/shoot-grid"
import type {
  CategoryShootSurfaceHandlers,
  CategoryShootSurfaceMode,
} from "@/features/cloudinary/category/_types/shoot"
import { ConnectionNotice } from "@/features/cloudinary/media/_components/notices"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type {
  CloudinaryConnection,
  CloudinaryFolder,
  CloudinaryShootSummary,
} from "@/lib/cloudinary.server"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { PencilIcon } from "lucide-react"
import type { ChangeEvent } from "react"

function CategoryShootSurface({
  category,
  connection,
  handlers,
  mode,
  shoots,
}: {
  category: CloudinaryFolder
  connection: CloudinaryConnection
  handlers: CategoryShootSurfaceHandlers
  mode: CategoryShootSurfaceMode
  shoots: CloudinaryShootSummary[]
}) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-[1540px] flex-col px-4 sm:px-6 lg:px-8",
        mode.type === "admin" ? "pb-16" : "pt-2 pb-6 md:pt-0 md:pb-10"
      )}
    >
      {mode.type === "admin" ? (
        <ConnectionNotice connection={connection} />
      ) : null}
      <CategoryShootHeader
        category={category}
        handlers={handlers}
        mode={mode}
      />
      {shoots.length > 0 || mode.type === "admin" ? (
        <CategoryShootGrid
          category={category}
          handlers={handlers}
          mode={mode}
          shoots={shoots}
        />
      ) : (
        <p className="py-16 text-sm text-muted-foreground">
          No shoots in this category yet.
        </p>
      )}
    </section>
  )
}

function CategoryShootHeader({
  category,
  handlers,
  mode,
}: {
  category: CloudinaryFolder
  handlers: CategoryShootSurfaceHandlers
  mode: CategoryShootSurfaceMode
}) {
  return (
    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-7">
      <div className="min-w-0 flex-1">
        {mode.type === "admin" && mode.isRenamingCategory ? (
          <CategoryRenameForm
            category={category}
            handlers={handlers}
            mode={mode}
          />
        ) : (
          <CategoryReadOnlyHeading
            category={category}
            handlers={handlers}
            mode={mode}
          />
        )}
      </div>
      {mode.type === "admin" ? (
        <CategoryShootHeaderActions
          category={category}
          handlers={handlers}
          mode={mode}
        />
      ) : null}
    </div>
  )
}

function CategoryRenameForm({
  category,
  handlers,
  mode,
}: {
  category: CloudinaryFolder
  handlers: CategoryShootSurfaceHandlers
  mode: Extract<CategoryShootSurfaceMode, { type: "admin" }>
}) {
  const handleRenameNameChange = useStableCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handlers.onRenameNameChange(event.target.value)
    }
  )
  const descriptionMode = getCategoryDescriptionMode(mode)

  return (
    <form className="grid w-full gap-3" onSubmit={handlers.onRenameCategory}>
      <div className="flex w-full max-w-3xl items-center gap-3">
        <Input
          aria-label="Category folder name"
          value={mode.renameName}
          className="h-auto border-x-0 border-t-0 py-0 font-heading text-4xl leading-none tracking-normal md:text-6xl"
          disabled={!mode.canRenameCategory || mode.isBusy}
          onChange={handleRenameNameChange}
        />
        <CategoryEditActions
          canSave={
            mode.canRenameCategory &&
            !mode.isBusy &&
            mode.renameName.trim() !== ""
          }
          isBusy={mode.isBusy}
          onCancel={handlers.onCancelRenamingCategory}
        />
      </div>
      <CategoryDescription
        category={category}
        descriptionDraft={mode.descriptionDraft}
        mode={descriptionMode}
        onCancelEdit={handlers.onCancelRenamingCategory}
        onDescriptionDraftChange={handlers.onDescriptionDraftChange}
      />
    </form>
  )
}

function CategoryReadOnlyHeading({
  category,
  handlers,
  mode,
}: {
  category: CloudinaryFolder
  handlers: CategoryShootSurfaceHandlers
  mode: CategoryShootSurfaceMode
}) {
  return (
    <>
      <h1 className="font-heading text-4xl leading-none tracking-normal md:text-6xl">
        {category.name}
      </h1>
      <CategoryDescription
        category={category}
        descriptionDraft={mode.descriptionDraft}
        mode={getCategoryDescriptionMode(mode)}
        onCancelEdit={handlers.onCancelRenamingCategory}
        onDescriptionDraftChange={handlers.onDescriptionDraftChange}
      />
    </>
  )
}

function CategoryShootHeaderActions({
  category,
  handlers,
  mode,
}: {
  category: CloudinaryFolder
  handlers: CategoryShootSurfaceHandlers
  mode: Extract<CategoryShootSurfaceMode, { type: "admin" }>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={mode.isRenamingCategory ? "secondary" : "outline"}
        size="icon-sm"
        disabled={!mode.canRenameCategory || mode.isBusy}
        aria-pressed={mode.isRenamingCategory}
        onClick={handlers.onStartRenamingCategory}
      >
        <PencilIcon />
        <span className="sr-only">Edit category name</span>
      </Button>
      <CreateShootDialog
        canCreateShoot={mode.canCreateShoot}
        createShootFiles={mode.createShootFiles}
        createShootName={mode.createShootName}
        isBusy={mode.isBusy}
        open={mode.isCreateShootDialogOpen}
        selectedCategoryName={category.name}
        onCreateShoot={handlers.onCreateShoot}
        onFilesChange={handlers.onCreateShootFilesChange}
        onNameChange={handlers.onCreateShootNameChange}
        onOpenChange={handlers.onCreateShootDialogOpenChange}
      />
      <DeleteCategoryDialog
        canDeleteCategory={mode.canDeleteCategory}
        category={category}
        isBusy={mode.isBusy}
        onDeleteCategory={handlers.onDeleteCategory}
      />
    </div>
  )
}

function getCategoryDescriptionMode(
  mode: CategoryShootSurfaceMode
): CategoryDescriptionMode {
  if (mode.type === "public") {
    return { type: "public" }
  }

  return {
    type: "admin",
    canEditDescription: mode.canEditDescription,
    canSaveEdit:
      mode.canRenameCategory && !mode.isBusy && mode.renameName.trim() !== "",
    isBusy: mode.isBusy,
    isEditing: mode.isRenamingCategory,
  }
}

export { CategoryShootSurface }
