import {
  createCloudinaryFolderFn,
  deleteCloudinaryFolderFn,
  getCloudinaryCategoryFn,
  renameCloudinaryFolderFn,
  reorderCloudinaryShootsFn,
  setCloudinaryCategoryCoverFn,
} from "@/features/cloudinary/cloudinary.functions"
import { GalleryHeader } from "@/features/cloudinary/gallery-header"
import {
  CARD_IMAGE_SIZES,
  getImageLoadingProps,
} from "@/features/cloudinary/image-delivery"
import { ProgressiveImage } from "@/features/cloudinary/progressive-image"
import {
  getMediaCategoryRoute,
  getMediaHomeRoute,
  getMediaShootRoute,
} from "@/lib/admin-routes"
import type {
  CloudinaryCategoryPage,
  CloudinaryConnection,
  CloudinaryFolder,
  CloudinaryShootSummary,
} from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
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
import {
  AlertTriangleIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react"

type ShootDropPosition = "before" | "after"
type ShootDropTarget = {
  shootPath: string
  position: ShootDropPosition
}

export const Route = createFileRoute("/$category")({
  loader: ({ params }) =>
    getCloudinaryCategoryFn({
      data: { categoryName: params.category },
    }),
  component: PublicCategoryPage,
})

function PublicCategoryPage() {
  const initialCategoryPage = Route.useLoaderData()
  const { category } = Route.useParams()

  return (
    <CategoryPage
      category={category}
      initialCategoryPage={initialCategoryPage}
      isAdminMode={false}
    />
  )
}

function CategoryPage({
  category,
  initialCategoryPage,
  isAdminMode,
}: {
  category: string
  initialCategoryPage: CloudinaryCategoryPage
  isAdminMode: boolean
}) {
  const navigate = useNavigate()
  const hasShootSegment = useRouterState({
    select: (state) =>
      state.location.pathname.split("/").filter(Boolean).length >
      (isAdminMode ? 2 : 1),
  })
  const [categoryPage, setCategoryPage] = useState(initialCategoryPage)
  const [createShootName, setCreateShootName] = useState("")
  const [createShootFiles, setCreateShootFiles] = useState<File[]>([])
  const [isCreateShootDialogOpen, setIsCreateShootDialogOpen] = useState(false)
  const [renameName, setRenameName] = useState(
    initialCategoryPage.category?.name || ""
  )
  const [isRenamingCategory, setIsRenamingCategory] = useState(false)
  const [selectedShootPaths, setSelectedShootPaths] = useState<Set<string>>(
    () => new Set()
  )
  const [draggingShootPath, setDraggingShootPath] = useState<string | null>(
    null
  )
  const [shootDropTarget, setShootDropTarget] =
    useState<ShootDropTarget | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const getCategory = useServerFn(getCloudinaryCategoryFn)
  const createFolder = useServerFn(createCloudinaryFolderFn)
  const renameFolder = useServerFn(renameCloudinaryFolderFn)
  const deleteFolder = useServerFn(deleteCloudinaryFolderFn)
  const reorderShoots = useServerFn(reorderCloudinaryShootsFn)
  const setCategoryCover = useServerFn(setCloudinaryCategoryCoverFn)
  const selectedCategory = categoryPage.category || undefined
  const shoots = categoryPage.shoots
  const canMutate =
    categoryPage.connection.configured &&
    !categoryPage.connection.error &&
    !isBusy
  const canCreateShoot = canMutate && Boolean(selectedCategory)
  const canOrganizeShoots =
    canMutate && selectedCategory?.orderRank !== undefined
  const canRenameCategory = canMutate && Boolean(selectedCategory)

  useEffect(() => {
    setCategoryPage(initialCategoryPage)
    setRenameName(initialCategoryPage.category?.name || "")
    setIsRenamingCategory(false)
    setSelectedShootPaths(new Set())
    setDraggingShootPath(null)
    setShootDropTarget(null)
  }, [initialCategoryPage])

  function refreshCategory() {
    void runCategoryAction(
      () =>
        getCategory({
          data: {
            categoryName: selectedCategory?.name || category,
            refresh: true,
          },
        }),
      "Media refreshed"
    )
  }

  function handleCreateShootDialogOpenChange(open: boolean) {
    setIsCreateShootDialogOpen(open)

    if (!open) {
      setCreateShootName("")
      setCreateShootFiles([])
    }
  }

  function handleCreateShootFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setCreateShootFiles(Array.from(event.target.files || []))
  }

  function handleCreateShoot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedCategory) {
      toast.error("Select a category before adding shoots.")
      return
    }

    const nextShootName = createShootName.trim()

    if (!nextShootName) {
      return
    }

    const nextShootPath = `${selectedCategory.path}/${nextShootName}`
    const createShootPromise = performCategoryAction(async () => {
      await createFolder({
        data: {
          name: nextShootName,
          parentPath: selectedCategory.path,
        },
      })

      if (createShootFiles.length > 0) {
        await uploadFilesToShoot(nextShootPath, createShootFiles)
      }

      return await getCategory({
        data: { categoryName: selectedCategory.name },
      })
    })

    toast.promise(createShootPromise, {
      loading:
        createShootFiles.length > 0
          ? "Creating shoot and uploading photos..."
          : "Creating shoot...",
      success: "Shoot created",
      error: (createError) => getErrorMessage(createError),
    })

    void createShootPromise
      .then(() => {
        setCreateShootName("")
        setCreateShootFiles([])
        setIsCreateShootDialogOpen(false)

        void navigate({
          to: getMediaShootRoute(isAdminMode),
          params: {
            category: toMediaRouteSegment(selectedCategory.name),
            shoot: toMediaRouteSegment(nextShootName),
          },
        })

        return undefined
      })
      .catch(() => undefined)
  }

  async function uploadFilesToShoot(shootPath: string, files: File[]) {
    const formData = new FormData()

    formData.set("folderPath", shootPath)

    for (const file of files) {
      formData.append("files", file)
    }

    const response = await fetch("/api/cloudinary/upload", {
      method: "POST",
      body: formData,
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(getUploadError(result) || "Upload failed.")
    }
  }

  function handleRenameCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedCategory) {
      return
    }

    const nextName = renameName.trim()

    if (!nextName) {
      return
    }

    if (nextName === selectedCategory.name) {
      setIsRenamingCategory(false)
      return
    }

    const renameCategoryPromise = performCategoryAction(async () => {
      await renameFolder({
        data: {
          folderPath: selectedCategory.path,
          name: nextName,
        },
      })

      return await getCategory({ data: { categoryName: nextName } })
    })

    toast.promise(renameCategoryPromise, {
      loading: "Renaming category...",
      success: "Category renamed",
      error: (renameError) => getErrorMessage(renameError),
    })

    void renameCategoryPromise
      .then(() => {
        setIsRenamingCategory(false)

        void navigate({
          to: getMediaCategoryRoute(isAdminMode),
          params: { category: toMediaRouteSegment(nextName) },
        })

        return undefined
      })
      .catch(() => undefined)
  }

  function startRenamingCategory() {
    if (!selectedCategory) {
      return
    }

    setRenameName(selectedCategory.name)
    setIsRenamingCategory(true)
  }

  function cancelRenamingCategory() {
    setRenameName(selectedCategory?.name || "")
    setIsRenamingCategory(false)
  }

  function handleDeleteCategory() {
    if (!selectedCategory) {
      return
    }

    void runCategoryAction(async () => {
      await deleteFolder({ data: { folderPath: selectedCategory.path } })

      return await getCategory({ data: { categoryName: category } })
    }, "Category deleted").then((didSucceed) => {
      if (didSucceed) {
        void navigate({ to: getMediaHomeRoute(isAdminMode) })
      }

      return undefined
    })
  }

  function handleSetCategoryCover(shootPath: string) {
    if (!selectedCategory) {
      return
    }

    if (selectedCategory.coverShootPath === shootPath) {
      return
    }

    const previousCategoryPage = categoryPage
    const selectedShoot = shoots.find((shoot) => shoot.path === shootPath)

    setCategoryPage({
      ...categoryPage,
      category: {
        ...selectedCategory,
        coverShootPath: shootPath,
      },
      categories: categoryPage.categories.map((categorySummary) =>
        categorySummary.path === selectedCategory.path
          ? {
              ...categorySummary,
              cover: selectedShoot?.cover || categorySummary.cover,
            }
          : categorySummary
      ),
    })

    void setCategoryCover({
      data: {
        categoryPath: selectedCategory.path,
        selectedFolder: selectedCategory.path,
        shootPath,
      },
    })
      .then(() => {
        toast.success("Category cover saved")

        return undefined
      })
      .catch((coverError) => {
        setCategoryPage(previousCategoryPage)
        toast.error(getErrorMessage(coverError))

        return undefined
      })
  }

  function handleShootDragStart(
    event: DragEvent<HTMLElement>,
    shootPath: string
  ) {
    if (!canOrganizeShoots) {
      return
    }

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", shootPath)
    setDraggingShootPath(shootPath)
  }

  function handleShootDragOver(
    event: DragEvent<HTMLElement>,
    shootPath: string
  ) {
    if (!canOrganizeShoots || draggingShootPath === shootPath) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const position = getShootDropPosition(event)

    setShootDropTarget((currentDropTarget) => {
      if (
        currentDropTarget?.shootPath === shootPath &&
        currentDropTarget.position === position
      ) {
        return currentDropTarget
      }

      return { shootPath, position }
    })
  }

  function handleShootDrop(event: DragEvent<HTMLElement>, shootPath: string) {
    if (!canOrganizeShoots) {
      return
    }

    event.preventDefault()

    const draggedShootPath =
      event.dataTransfer.getData("text/plain") || draggingShootPath
    const dropPosition =
      shootDropTarget?.shootPath === shootPath
        ? shootDropTarget.position
        : getShootDropPosition(event)

    if (!draggedShootPath || draggedShootPath === shootPath) {
      return
    }

    const nextShoots = moveShootToDropTarget(
      shoots,
      draggedShootPath,
      shootPath,
      dropPosition
    )

    if (!nextShoots) {
      return
    }

    saveShootOrder(nextShoots)
  }

  function handleShootDragEnd() {
    setDraggingShootPath(null)
    setShootDropTarget(null)
  }

  function toggleShootSelection(shootPath: string, selected?: boolean) {
    setSelectedShootPaths((currentShootPaths) => {
      const nextShootPaths = new Set(currentShootPaths)
      const shouldSelect = selected ?? !nextShootPaths.has(shootPath)

      if (shouldSelect) {
        nextShootPaths.add(shootPath)
      } else {
        nextShootPaths.delete(shootPath)
      }

      return nextShootPaths
    })
  }

  function clearShootSelection() {
    setSelectedShootPaths(new Set())
  }

  function saveShootOrder(nextShoots: CloudinaryShootSummary[]) {
    if (!selectedCategory || !canOrganizeShoots) {
      return
    }

    const previousCategoryPage = categoryPage

    setCategoryPage({
      ...categoryPage,
      shoots: nextShoots,
    })
    setDraggingShootPath(null)
    setShootDropTarget(null)

    void reorderShoots({
      data: {
        categoryPath: selectedCategory.path,
        selectedFolder: selectedCategory.path,
        shootPaths: nextShoots.map((shoot) => shoot.path),
      },
    })
      .then(() => {
        toast.success("Shoot order saved")

        return undefined
      })
      .catch((orderError) => {
        setCategoryPage(previousCategoryPage)
        toast.error(getErrorMessage(orderError))

        return undefined
      })
  }

  async function performCategoryAction(
    action: () => Promise<CloudinaryCategoryPage>
  ) {
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

  async function runCategoryAction(
    action: () => Promise<CloudinaryCategoryPage>,
    successMessage: string
  ) {
    try {
      await performCategoryAction(action)

      toast.success(successMessage)
      return true
    } catch (actionError) {
      toast.error(getErrorMessage(actionError))
      return false
    }
  }

  return (
    <main className="flex min-h-[90svh] flex-col bg-background text-foreground">
      <GalleryHeader
        categories={categoryPage.categories}
        activeCategoryPath={categoryPage.category?.path}
        isAdminMode={isAdminMode}
      />
      {hasShootSegment ? (
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      ) : selectedCategory ? (
        <CategoryShootSurface
          canCreateShoot={canCreateShoot}
          canDeleteCategory={canRenameCategory}
          canOrganize={canOrganizeShoots}
          canRenameCategory={canRenameCategory}
          category={selectedCategory}
          connection={categoryPage.connection}
          createShootFiles={createShootFiles}
          createShootName={createShootName}
          draggingShootPath={draggingShootPath}
          isAdminMode={isAdminMode}
          isBusy={isBusy}
          isCreateShootDialogOpen={isCreateShootDialogOpen}
          isRenamingCategory={isRenamingCategory}
          renameName={renameName}
          selectedShootPaths={selectedShootPaths}
          shootDropTarget={shootDropTarget}
          shoots={shoots}
          onCancelRenamingCategory={cancelRenamingCategory}
          onClearShootSelection={clearShootSelection}
          onCreateShoot={handleCreateShoot}
          onCreateShootDialogOpenChange={handleCreateShootDialogOpenChange}
          onCreateShootFilesChange={handleCreateShootFilesChange}
          onCreateShootNameChange={setCreateShootName}
          onDeleteCategory={handleDeleteCategory}
          onDragEnd={handleShootDragEnd}
          onRefresh={refreshCategory}
          onRenameCategory={handleRenameCategory}
          onRenameNameChange={setRenameName}
          onSetCategoryCover={handleSetCategoryCover}
          onShootDragOver={handleShootDragOver}
          onShootDragStart={handleShootDragStart}
          onShootDrop={handleShootDrop}
          onShootSelectionChange={toggleShootSelection}
          onStartRenamingCategory={startRenamingCategory}
        />
      ) : (
        <MissingCategory categoryName={category} />
      )}
    </main>
  )
}

export { CategoryPage }

function CategoryShootSurface({
  canCreateShoot,
  canDeleteCategory,
  canOrganize,
  canRenameCategory,
  category,
  connection,
  createShootFiles,
  createShootName,
  draggingShootPath,
  isAdminMode,
  isBusy,
  isCreateShootDialogOpen,
  isRenamingCategory,
  renameName,
  selectedShootPaths,
  shootDropTarget,
  shoots,
  onCancelRenamingCategory,
  onClearShootSelection,
  onCreateShoot,
  onCreateShootDialogOpenChange,
  onCreateShootFilesChange,
  onCreateShootNameChange,
  onDeleteCategory,
  onDragEnd,
  onRefresh,
  onRenameCategory,
  onRenameNameChange,
  onSetCategoryCover,
  onShootDragOver,
  onShootDragStart,
  onShootDrop,
  onShootSelectionChange,
  onStartRenamingCategory,
}: {
  canCreateShoot: boolean
  canDeleteCategory: boolean
  canOrganize: boolean
  canRenameCategory: boolean
  category: CloudinaryFolder
  connection: CloudinaryConnection
  createShootFiles: File[]
  createShootName: string
  draggingShootPath: string | null
  isAdminMode: boolean
  isBusy: boolean
  isCreateShootDialogOpen: boolean
  isRenamingCategory: boolean
  renameName: string
  selectedShootPaths: Set<string>
  shootDropTarget: ShootDropTarget | null
  shoots: CloudinaryShootSummary[]
  onCancelRenamingCategory: () => void
  onClearShootSelection: () => void
  onCreateShoot: (event: FormEvent<HTMLFormElement>) => void
  onCreateShootDialogOpenChange: (open: boolean) => void
  onCreateShootFilesChange: (event: ChangeEvent<HTMLInputElement>) => void
  onCreateShootNameChange: (name: string) => void
  onDeleteCategory: () => void
  onDragEnd: () => void
  onRefresh: () => void
  onRenameCategory: (event: FormEvent<HTMLFormElement>) => void
  onRenameNameChange: (name: string) => void
  onSetCategoryCover: (shootPath: string) => void
  onShootDragOver: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDragStart: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDrop: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootSelectionChange: (shootPath: string, selected?: boolean) => void
  onStartRenamingCategory: () => void
}) {
  const effectiveCoverPath = category.coverShootPath || shoots[0]?.path
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenamingCategory) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [isRenamingCategory])

  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-[1540px] flex-col px-4 sm:px-6 lg:px-8",
        isAdminMode ? "pb-16" : "pt-2 pb-6 md:pt-0 md:pb-10"
      )}
    >
      {isAdminMode ? <ConnectionNotice connection={connection} /> : null}
      <div className="mt-2 mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mt-3 md:mb-7">
        <div className="min-w-0">
          {isRenamingCategory ? (
            <form
              className="flex max-w-3xl items-center gap-3"
              onSubmit={onRenameCategory}
            >
              <Input
                ref={renameInputRef}
                aria-label="Category folder name"
                value={renameName}
                className="h-auto border-x-0 border-t-0 py-0 font-heading text-4xl leading-none tracking-normal md:text-6xl"
                disabled={!canRenameCategory || isBusy}
                onChange={(event) => onRenameNameChange(event.target.value)}
              />
              <Button
                type="submit"
                size="icon"
                disabled={
                  !canRenameCategory || isBusy || renameName.trim() === ""
                }
              >
                <CheckIcon />
                <span className="sr-only">Save category name</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isBusy}
                onClick={onCancelRenamingCategory}
              >
                <XIcon />
                <span className="sr-only">Cancel category rename</span>
              </Button>
            </form>
          ) : (
            <h1 className="font-heading text-4xl leading-none tracking-normal md:text-6xl">
              {category.name}
            </h1>
          )}
        </div>
        {isAdminMode ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={onRefresh}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Refresh
            </Button>
            <Button
              type="button"
              variant={isRenamingCategory ? "secondary" : "outline"}
              size="icon-sm"
              disabled={!canRenameCategory || isBusy}
              aria-pressed={isRenamingCategory}
              onClick={onStartRenamingCategory}
            >
              <PencilIcon />
              <span className="sr-only">Edit category name</span>
            </Button>
            <CreateShootDialog
              canCreateShoot={canCreateShoot}
              createShootFiles={createShootFiles}
              createShootName={createShootName}
              isBusy={isBusy}
              open={isCreateShootDialogOpen}
              selectedCategoryName={category.name}
              onCreateShoot={onCreateShoot}
              onFilesChange={onCreateShootFilesChange}
              onNameChange={onCreateShootNameChange}
              onOpenChange={onCreateShootDialogOpenChange}
            />
            <DeleteCategoryDialog
              canDeleteCategory={canDeleteCategory}
              category={category}
              isBusy={isBusy}
              onDeleteCategory={onDeleteCategory}
            />
          </div>
        ) : null}
      </div>
      {shoots.length > 0 || isAdminMode ? (
        <div className="grid gap-x-14 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {shoots.map((shoot, index) => (
            <ShootCard
              key={shoot.path}
              canOrganize={canOrganize}
              dropPosition={
                shootDropTarget?.shootPath === shoot.path &&
                draggingShootPath !== shoot.path
                  ? shootDropTarget.position
                  : null
              }
              draggingShootPath={draggingShootPath}
              isAdminMode={isAdminMode}
              isBusy={isBusy}
              isCategoryCover={shoot.path === effectiveCoverPath}
              isPriority={index < 3}
              isSelected={selectedShootPaths.has(shoot.path)}
              shoot={shoot}
              onDragEnd={onDragEnd}
              onSetCategoryCover={onSetCategoryCover}
              onShootDragOver={onShootDragOver}
              onShootDragStart={onShootDragStart}
              onShootDrop={onShootDrop}
              onShootSelectionChange={onShootSelectionChange}
            />
          ))}
          {isAdminMode && selectedShootPaths.size > 0 ? (
            <SelectedShootsActionBar
              selectedCount={selectedShootPaths.size}
              onClearSelection={onClearShootSelection}
            />
          ) : null}
        </div>
      ) : (
        <p className="py-16 text-sm text-muted-foreground">
          No shoots in this category yet.
        </p>
      )}
    </section>
  )
}

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
  const createShootInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      createShootInputRef.current?.focus()
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
            disabled={!canCreateShoot || isBusy}
          />
        }
      >
        <PlusIcon />
        <span className="sr-only">Create shoot</span>
      </DialogTrigger>
      <DialogContent>
        <form className="grid gap-5" onSubmit={onCreateShoot}>
          <DialogHeader>
            <DialogTitle>New shoot</DialogTitle>
            <DialogDescription>{selectedCategoryName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-shoot">Shoot name</Label>
              <Input
                ref={createShootInputRef}
                id="new-shoot"
                value={createShootName}
                placeholder="Shoot name"
                disabled={!canCreateShoot || isBusy}
                onChange={(event) => onNameChange(event.target.value)}
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
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
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
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            disabled={!canDeleteCategory || isBusy}
          />
        }
      >
        <Trash2Icon />
        <span className="sr-only">Delete category</span>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete category?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{category.name}&quot;, every
            shoot inside this category, and all photos in those shoots. This
            cannot be undone.
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

function ShootCard({
  canOrganize,
  dropPosition,
  draggingShootPath,
  isAdminMode,
  isBusy,
  isCategoryCover,
  isPriority,
  isSelected,
  shoot,
  onDragEnd,
  onSetCategoryCover,
  onShootDragOver,
  onShootDragStart,
  onShootDrop,
  onShootSelectionChange,
}: {
  canOrganize: boolean
  dropPosition: ShootDropPosition | null
  draggingShootPath: string | null
  isAdminMode: boolean
  isBusy: boolean
  isCategoryCover: boolean
  isPriority: boolean
  isSelected: boolean
  shoot: CloudinaryShootSummary
  onDragEnd: () => void
  onSetCategoryCover: (shootPath: string) => void
  onShootDragOver: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDragStart: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDrop: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootSelectionChange: (shootPath: string, selected?: boolean) => void
}) {
  return (
    <article
      draggable={isAdminMode && canOrganize && !isBusy}
      className={cn(
        "group relative overflow-hidden border bg-muted transition duration-200",
        isAdminMode && canOrganize && !isBusy
          ? "cursor-grab active:cursor-grabbing"
          : "",
        dropPosition ? "ring-2 ring-brand/70" : "",
        draggingShootPath === shoot.path
          ? "opacity-45 ring-2 ring-brand/50"
          : "",
        isSelected ? "ring-2 ring-brand/70" : ""
      )}
      onDragStart={(event) => onShootDragStart(event, shoot.path)}
      onDragOver={(event) => onShootDragOver(event, shoot.path)}
      onDrop={(event) => onShootDrop(event, shoot.path)}
      onDragEnd={onDragEnd}
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
        to={getMediaShootRoute(isAdminMode)}
        params={{
          category: toMediaRouteSegment(shoot.categoryName),
          shoot: toMediaRouteSegment(shoot.name),
        }}
        className="block w-full text-left ring-offset-background transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[3/4]">
          {shoot.cover ? (
            <ProgressiveImage
              src={shoot.cover.thumbnailUrl}
              srcSet={shoot.cover.thumbnailSrcSet}
              sizes={CARD_IMAGE_SIZES}
              alt={shoot.name}
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
              {...getImageLoadingProps(isPriority)}
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:42px_42px]" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 py-2.5 text-white">
            <h2 className="font-sans text-xs leading-tight font-semibold tracking-[0.12em] uppercase sm:text-sm">
              {shoot.name}
            </h2>
            <p className="mt-0.5 text-[0.625rem] leading-tight font-medium tracking-[0.12em] text-white/70 uppercase sm:text-[0.6875rem]">
              {shoot.assetCount} photos
            </p>
          </div>
        </div>
      </Link>
      {isAdminMode ? (
        <>
          <Checkbox
            checked={isSelected}
            disabled={isBusy}
            aria-label={isSelected ? "Deselect shoot" : "Select shoot"}
            className={cn(
              "absolute top-3 left-3 z-20 size-5 border-background/80 bg-background/90 text-primary-foreground shadow-sm transition-opacity",
              isSelected
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            )}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(checked) =>
              onShootSelectionChange(shoot.path, checked)
            }
          />
          <Button
            type="button"
            variant={isCategoryCover ? "brand" : "secondary"}
            size="sm"
            className={cn(
              "absolute right-3 bottom-3 z-20 h-8 px-2.5 text-xs shadow-sm backdrop-blur transition-opacity",
              isCategoryCover
                ? "opacity-100"
                : "bg-background/90 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            )}
            disabled={!canOrganize || isBusy}
            onClick={(event) => {
              event.stopPropagation()
              onSetCategoryCover(shoot.path)
            }}
          >
            <StarIcon data-icon="inline-start" />
            Cover
          </Button>
        </>
      ) : null}
    </article>
  )
}

function SelectedShootsActionBar({
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

function MissingCategory({ categoryName }: { categoryName: string }) {
  return (
    <section className="mx-auto flex min-h-[58svh] w-full max-w-[1540px] flex-col justify-center px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        Category not found
      </p>
      <h1 className="mt-4 font-heading text-5xl tracking-[0.12em] uppercase">
        {categoryName}
      </h1>
    </section>
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

function getShootDropPosition(
  event: DragEvent<HTMLElement>
): ShootDropPosition {
  const bounds = event.currentTarget.getBoundingClientRect()
  const midpoint = bounds.top + bounds.height / 2

  return event.clientY < midpoint ? "before" : "after"
}

function moveShootToDropTarget(
  shoots: CloudinaryShootSummary[],
  draggedShootPath: string,
  targetShootPath: string,
  dropPosition: ShootDropPosition
) {
  const fromIndex = shoots.findIndex((shoot) => shoot.path === draggedShootPath)
  const toIndex = shoots.findIndex((shoot) => shoot.path === targetShootPath)

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null
  }

  const nextShoots = shoots.slice()
  const [draggedShoot] = nextShoots.splice(fromIndex, 1)

  if (!draggedShoot) {
    return null
  }

  const nextIndex = nextShoots.findIndex(
    (shoot) => shoot.path === targetShootPath
  )

  if (nextIndex === -1) {
    return null
  }

  const insertIndex = dropPosition === "after" ? nextIndex + 1 : nextIndex

  nextShoots.splice(insertIndex, 0, draggedShoot)

  const didChange = nextShoots.some(
    (shoot, index) => shoot.path !== shoots[index]?.path
  )

  if (!didChange) {
    return null
  }

  return nextShoots
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong."
}

function getUploadError(result: unknown) {
  if (!result || typeof result !== "object") {
    return null
  }

  const error = "error" in result ? result.error : null

  return typeof error === "string" ? error : null
}
