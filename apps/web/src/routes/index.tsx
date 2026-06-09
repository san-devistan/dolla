import {
  createCloudinaryFolderFn,
  getCloudinaryHomeFn,
  reorderCloudinaryCategoriesFn,
} from "@/features/cloudinary/cloudinary.functions"
import { GalleryHeader } from "@/features/cloudinary/gallery-header"
import {
  CARD_IMAGE_SIZES,
  getImageLoadingProps,
} from "@/features/cloudinary/image-delivery"
import { ProgressiveImage } from "@/features/cloudinary/progressive-image"
import type {
  CloudinaryConnection,
  CloudinaryHome,
} from "@/lib/cloudinary.server"
import {
  getMediaAdminSearch,
  isMediaAdminMode,
  validateMediaAdminSearch,
} from "@/lib/media-admin-mode"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import { AlertTriangleIcon, PlusIcon } from "lucide-react"
import {
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react"

type CategoryDropPosition = "before" | "after"
type CategoryDropTarget = {
  categoryPath: string
  position: CategoryDropPosition
}

export const Route = createFileRoute("/")({
  validateSearch: validateMediaAdminSearch,
  loader: () => getCloudinaryHomeFn({ data: {} }),
  component: DollaHomePage,
})

function DollaHomePage() {
  const initialHome = Route.useLoaderData()
  const search = Route.useSearch()
  const isAdminMode = isMediaAdminMode(search)
  const [home, setHome] = useState(initialHome)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] =
    useState(false)
  const [selectedCategoryPaths, setSelectedCategoryPaths] = useState<
    Set<string>
  >(() => new Set())
  const [draggingCategoryPath, setDraggingCategoryPath] = useState<
    string | null
  >(null)
  const [categoryDropTarget, setCategoryDropTarget] =
    useState<CategoryDropTarget | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const getHome = useServerFn(getCloudinaryHomeFn)
  const createFolder = useServerFn(createCloudinaryFolderFn)
  const reorderCategories = useServerFn(reorderCloudinaryCategoriesFn)
  const canMutate =
    home.connection.configured && !home.connection.error && !isBusy
  const canOrganizeCategories = canMutate && home.categories.length > 0

  useEffect(() => {
    setHome(initialHome)
    setSelectedCategoryPaths(new Set())
    setDraggingCategoryPath(null)
    setCategoryDropTarget(null)
    setIsCreateCategoryDialogOpen(false)
  }, [initialHome])

  function refreshHome() {
    void runHomeAction(
      () => getHome({ data: { refresh: true } }),
      "Media refreshed"
    )
  }

  function handleCreateCategoryDialogOpenChange(open: boolean) {
    setIsCreateCategoryDialogOpen(open)

    if (!open) {
      setNewCategoryName("")
    }
  }

  function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextCategoryName = newCategoryName.trim()

    if (!nextCategoryName) {
      return
    }

    const createCategoryPromise = performHomeAction(async () => {
      await createFolder({
        data: {
          name: nextCategoryName,
          parentPath: home.rootFolder,
        },
      })

      return await getHome({ data: {} })
    })

    toast.promise(createCategoryPromise, {
      loading: "Creating category...",
      success: "Category created",
      error: (createError) => getErrorMessage(createError),
    })

    void createCategoryPromise
      .then(() => {
        setNewCategoryName("")
        setIsCreateCategoryDialogOpen(false)

        return undefined
      })
      .catch(() => undefined)
  }

  function toggleCategorySelection(categoryPath: string, selected?: boolean) {
    setSelectedCategoryPaths((currentCategoryPaths) => {
      const nextCategoryPaths = new Set(currentCategoryPaths)
      const shouldSelect = selected ?? !nextCategoryPaths.has(categoryPath)

      if (shouldSelect) {
        nextCategoryPaths.add(categoryPath)
      } else {
        nextCategoryPaths.delete(categoryPath)
      }

      return nextCategoryPaths
    })
  }

  function clearCategorySelection() {
    setSelectedCategoryPaths(new Set())
  }

  function handleCategoryDragStart(
    event: DragEvent<HTMLElement>,
    categoryPath: string
  ) {
    if (!canOrganizeCategories) {
      return
    }

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", categoryPath)
    setDraggingCategoryPath(categoryPath)
  }

  function handleCategoryDragOver(
    event: DragEvent<HTMLElement>,
    categoryPath: string
  ) {
    if (!canOrganizeCategories || draggingCategoryPath === categoryPath) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const position = getCategoryDropPosition(event)

    setCategoryDropTarget((currentDropTarget) => {
      if (
        currentDropTarget?.categoryPath === categoryPath &&
        currentDropTarget.position === position
      ) {
        return currentDropTarget
      }

      return { categoryPath, position }
    })
  }

  function handleCategoryDrop(
    event: DragEvent<HTMLElement>,
    categoryPath: string
  ) {
    if (!canOrganizeCategories) {
      return
    }

    event.preventDefault()

    const draggedCategoryPath =
      event.dataTransfer.getData("text/plain") || draggingCategoryPath
    const dropPosition =
      categoryDropTarget?.categoryPath === categoryPath
        ? categoryDropTarget.position
        : getCategoryDropPosition(event)

    if (!draggedCategoryPath || draggedCategoryPath === categoryPath) {
      return
    }

    const nextCategories = moveItemToDropTarget(
      home.categories,
      draggedCategoryPath,
      categoryPath,
      dropPosition,
      (category) => category.path
    )

    if (!nextCategories) {
      return
    }

    saveCategoryOrder(nextCategories)
  }

  function handleCategoryDragEnd() {
    setDraggingCategoryPath(null)
    setCategoryDropTarget(null)
  }

  function saveCategoryOrder(nextCategories: CloudinaryHome["categories"]) {
    if (!canOrganizeCategories) {
      return
    }

    const previousHome = home

    setHome({
      ...home,
      categories: nextCategories,
    })
    setDraggingCategoryPath(null)
    setCategoryDropTarget(null)

    void reorderCategories({
      data: {
        categoryPaths: nextCategories.map((category) => category.path),
      },
    })
      .then(() => {
        toast.success("Category order saved")

        return undefined
      })
      .catch((orderError) => {
        setHome(previousHome)
        toast.error(getErrorMessage(orderError))

        return undefined
      })
  }

  async function performHomeAction(action: () => Promise<CloudinaryHome>) {
    setIsBusy(true)

    try {
      const nextHome = await action()

      setHome(nextHome)

      if (nextHome.connection.error) {
        throw new Error(nextHome.connection.error)
      }

      return nextHome
    } finally {
      setIsBusy(false)
    }
  }

  async function runHomeAction(
    action: () => Promise<CloudinaryHome>,
    successMessage: string
  ) {
    try {
      await performHomeAction(action)

      toast.success(successMessage)
      return true
    } catch (actionError) {
      toast.error(getErrorMessage(actionError))
      return false
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <GalleryHeader categories={home.categories} isAdminMode={isAdminMode} />
      <section className="mx-auto w-full max-w-[1540px] px-4 pb-16 sm:px-6 lg:px-8">
        {isAdminMode ? <ConnectionNotice connection={home.connection} /> : null}
        <div className="mt-5 mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-5xl leading-none tracking-normal md:text-6xl">
              Categories
            </h1>
          </div>
          {isAdminMode ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={refreshHome}
              >
                Refresh
              </Button>
              <CreateCategoryDialog
                canCreateCategory={canMutate}
                isBusy={isBusy}
                newCategoryName={newCategoryName}
                open={isCreateCategoryDialogOpen}
                onCreateCategory={handleCreateCategory}
                onNameChange={setNewCategoryName}
                onOpenChange={handleCreateCategoryDialogOpenChange}
              />
            </div>
          ) : null}
        </div>
        <CategoryGrid
          canOrganizeCategories={canOrganizeCategories}
          categories={home.categories}
          categoryDropTarget={categoryDropTarget}
          draggingCategoryPath={draggingCategoryPath}
          isAdminMode={isAdminMode}
          isBusy={isBusy}
          selectedCategoryPaths={selectedCategoryPaths}
          onCategoryDragEnd={handleCategoryDragEnd}
          onCategoryDragOver={handleCategoryDragOver}
          onCategoryDragStart={handleCategoryDragStart}
          onCategoryDrop={handleCategoryDrop}
          onCategorySelectionChange={toggleCategorySelection}
          onClearCategorySelection={clearCategorySelection}
        />
      </section>
    </main>
  )
}

function CategoryGrid({
  canOrganizeCategories,
  categories,
  categoryDropTarget,
  draggingCategoryPath,
  isAdminMode,
  isBusy,
  selectedCategoryPaths,
  onCategoryDragEnd,
  onCategoryDragOver,
  onCategoryDragStart,
  onCategoryDrop,
  onCategorySelectionChange,
  onClearCategorySelection,
}: {
  canOrganizeCategories: boolean
  categories: CloudinaryHome["categories"]
  categoryDropTarget: CategoryDropTarget | null
  draggingCategoryPath: string | null
  isAdminMode: boolean
  isBusy: boolean
  selectedCategoryPaths: Set<string>
  onCategoryDragEnd: () => void
  onCategoryDragOver: (
    event: DragEvent<HTMLElement>,
    categoryPath: string
  ) => void
  onCategoryDragStart: (
    event: DragEvent<HTMLElement>,
    categoryPath: string
  ) => void
  onCategoryDrop: (event: DragEvent<HTMLElement>, categoryPath: string) => void
  onCategorySelectionChange: (categoryPath: string, selected?: boolean) => void
  onClearCategorySelection: () => void
}) {
  if (categories.length === 0 && !isAdminMode) {
    return (
      <p className="py-16 text-sm text-muted-foreground">
        No categories published yet.
      </p>
    )
  }

  return (
    <section className="grid gap-x-14 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => (
        <CategoryCard
          key={category.path}
          category={category}
          canOrganizeCategories={canOrganizeCategories}
          dropPosition={
            categoryDropTarget?.categoryPath === category.path &&
            draggingCategoryPath !== category.path
              ? categoryDropTarget.position
              : null
          }
          isDragging={draggingCategoryPath === category.path}
          isAdminMode={isAdminMode}
          isBusy={isBusy}
          isPriority={index < 3}
          isSelected={selectedCategoryPaths.has(category.path)}
          onCategoryDragEnd={onCategoryDragEnd}
          onCategoryDragOver={onCategoryDragOver}
          onCategoryDragStart={onCategoryDragStart}
          onCategoryDrop={onCategoryDrop}
          onCategorySelectionChange={onCategorySelectionChange}
        />
      ))}
      {isAdminMode && selectedCategoryPaths.size > 0 ? (
        <SelectedCategoriesActionBar
          selectedCount={selectedCategoryPaths.size}
          onClearSelection={onClearCategorySelection}
        />
      ) : null}
    </section>
  )
}

function CategoryCard({
  category,
  canOrganizeCategories,
  dropPosition,
  isDragging,
  isAdminMode,
  isBusy,
  isPriority,
  isSelected,
  onCategoryDragEnd,
  onCategoryDragOver,
  onCategoryDragStart,
  onCategoryDrop,
  onCategorySelectionChange,
}: {
  category: CloudinaryHome["categories"][number]
  canOrganizeCategories: boolean
  dropPosition: CategoryDropPosition | null
  isDragging: boolean
  isAdminMode: boolean
  isBusy: boolean
  isPriority: boolean
  isSelected: boolean
  onCategoryDragEnd: () => void
  onCategoryDragOver: (
    event: DragEvent<HTMLElement>,
    categoryPath: string
  ) => void
  onCategoryDragStart: (
    event: DragEvent<HTMLElement>,
    categoryPath: string
  ) => void
  onCategoryDrop: (event: DragEvent<HTMLElement>, categoryPath: string) => void
  onCategorySelectionChange: (categoryPath: string, selected?: boolean) => void
}) {
  return (
    <article
      draggable={isAdminMode && canOrganizeCategories && !isBusy}
      className={cn(
        "group relative overflow-hidden border bg-muted transition duration-200",
        isAdminMode && canOrganizeCategories && !isBusy
          ? "cursor-grab active:cursor-grabbing"
          : "",
        dropPosition ? "ring-2 ring-brand/70" : "",
        isDragging ? "opacity-45 ring-2 ring-brand/50" : "",
        isSelected ? "ring-2 ring-brand/70" : ""
      )}
      onDragStart={(event) => onCategoryDragStart(event, category.path)}
      onDragOver={(event) => onCategoryDragOver(event, category.path)}
      onDrop={(event) => onCategoryDrop(event, category.path)}
      onDragEnd={onCategoryDragEnd}
    >
      {dropPosition ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 z-30 flex justify-center",
            dropPosition === "before" ? "top-0" : "bottom-0"
          )}
        >
          <div className="h-1 w-[calc(100%-1rem)] bg-brand shadow-[0_0_0_1px_hsl(var(--background)),0_0_18px_hsl(var(--brand)/0.6)]" />
        </div>
      ) : null}
      <Link
        to="/$category"
        params={{ category: toMediaRouteSegment(category.name) }}
        search={getMediaAdminSearch(isAdminMode)}
        className="block w-full text-left ring-offset-background transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[3/4]">
          {category.cover ? (
            <ProgressiveImage
              src={category.cover.thumbnailUrl}
              srcSet={category.cover.thumbnailSrcSet}
              sizes={CARD_IMAGE_SIZES}
              alt={category.name}
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
              {...getImageLoadingProps(isPriority)}
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:42px_42px]" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 py-2.5 text-white">
            <h2 className="font-sans text-sm leading-tight font-semibold tracking-[0.12em] uppercase">
              {category.name}
            </h2>
            <p className="mt-0.5 text-[0.6875rem] leading-tight font-medium tracking-[0.12em] text-white/70 uppercase">
              {category.shootCount} shoots
            </p>
          </div>
        </div>
      </Link>
      {isAdminMode ? (
        <Checkbox
          checked={isSelected}
          disabled={isBusy}
          aria-label={isSelected ? "Deselect category" : "Select category"}
          className={cn(
            "absolute top-3 left-3 z-20 size-5 border-background/80 bg-background/90 text-primary-foreground shadow-sm transition-opacity",
            isSelected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          )}
          onClick={(event) => event.stopPropagation()}
          onCheckedChange={(checked) =>
            onCategorySelectionChange(category.path, checked)
          }
        />
      ) : null}
    </article>
  )
}

function SelectedCategoriesActionBar({
  selectedCount,
  onClearSelection,
}: {
  selectedCount: number
  onClearSelection: () => void
}) {
  return (
    <div className="fixed inset-x-4 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
      <span className="min-w-0 text-sm font-medium">
        {selectedCount} selected
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
      >
        Clear
      </Button>
    </div>
  )
}

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
  const categoryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      categoryInputRef.current?.focus()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!canCreateCategory || isBusy}
          />
        }
      >
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
              ref={categoryInputRef}
              id="new-category"
              value={newCategoryName}
              placeholder="Category name"
              disabled={!canCreateCategory || isBusy}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
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

function ConnectionNotice({
  connection,
}: {
  connection: CloudinaryConnection
}) {
  if (connection.configured && !connection.error) {
    return null
  }

  return (
    <div className="mt-5 flex items-start gap-3 border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">Media services are not ready.</p>
        {!connection.configured ? (
          <p className="text-muted-foreground">
            Missing server env: {connection.missingKeys.join(", ")}.
          </p>
        ) : null}
        {connection.error ? (
          <p className="text-muted-foreground">{connection.error}</p>
        ) : null}
      </div>
    </div>
  )
}

function getCategoryDropPosition(
  event: DragEvent<HTMLElement>
): CategoryDropPosition {
  const bounds = event.currentTarget.getBoundingClientRect()
  const midpoint = bounds.top + bounds.height / 2

  return event.clientY < midpoint ? "before" : "after"
}

function moveItemToDropTarget<T>(
  items: T[],
  draggedId: string,
  targetId: string,
  dropPosition: CategoryDropPosition,
  getItemId: (item: T) => string
) {
  const fromIndex = items.findIndex((item) => getItemId(item) === draggedId)
  const toIndex = items.findIndex((item) => getItemId(item) === targetId)

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null
  }

  const nextItems = items.slice()
  const [draggedItem] = nextItems.splice(fromIndex, 1)

  if (!draggedItem) {
    return null
  }

  const nextIndex = nextItems.findIndex((item) => getItemId(item) === targetId)

  if (nextIndex === -1) {
    return null
  }

  const insertIndex = dropPosition === "after" ? nextIndex + 1 : nextIndex

  nextItems.splice(insertIndex, 0, draggedItem)

  const didChange = nextItems.some((item, index) => {
    const previousItem = items[index]

    return !previousItem || getItemId(item) !== getItemId(previousItem)
  })

  if (!didChange) {
    return null
  }

  return nextItems
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong."
}
