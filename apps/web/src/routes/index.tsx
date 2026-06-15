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
import { getMediaCategoryRoute, getMediaShootRoute } from "@/lib/admin-routes"
import type {
  CloudinaryAsset,
  CloudinaryConnection,
  CloudinaryHome,
} from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
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
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react"
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
  loader: () => getCloudinaryHomeFn({ data: {} }),
  component: PublicDollaHomePage,
})

const HOME_CAROUSEL_IMAGE_SIZES = "(min-width: 1540px) 1540px, 100vw"
const HOME_CAROUSEL_IMAGE_WIDTHS = [960, 1280, 1600, 2200, 3200] as const

function PublicDollaHomePage() {
  const initialHome = Route.useLoaderData()

  return <DollaHomePage initialHome={initialHome} isAdminMode={false} />
}

function DollaHomePage({
  initialHome,
  isAdminMode,
}: {
  initialHome: CloudinaryHome
  isAdminMode: boolean
}) {
  const [home, setHome] = useState(initialHome)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] =
    useState(false)
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
    setDraggingCategoryPath(null)
    setCategoryDropTarget(null)
    setIsCreateCategoryDialogOpen(false)
  }, [initialHome])

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

  return (
    <main className="flex min-h-[90svh] flex-col bg-background text-foreground">
      <GalleryHeader categories={home.categories} isAdminMode={isAdminMode} />
      <section
        className={cn(
          "mx-auto flex w-full max-w-[1540px] flex-col px-4 sm:px-6 lg:px-8",
          isAdminMode ? "pb-16" : "pt-2 pb-6 md:pt-0 md:pb-10"
        )}
      >
        {isAdminMode ? <ConnectionNotice connection={home.connection} /> : null}
        <HomeHeroCarousel assets={home.heroAssets} isAdminMode={isAdminMode} />
        <div className="mt-2 mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mt-3 md:mb-7">
          <div>
            <h1 className="font-heading text-4xl leading-none tracking-normal md:text-6xl">
              Categories
            </h1>
          </div>
          {isAdminMode ? (
            <div className="flex flex-wrap gap-2">
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
          onCategoryDragEnd={handleCategoryDragEnd}
          onCategoryDragOver={handleCategoryDragOver}
          onCategoryDragStart={handleCategoryDragStart}
          onCategoryDrop={handleCategoryDrop}
        />
      </section>
    </main>
  )
}

export { DollaHomePage }

function HomeHeroCarousel({
  assets,
  isAdminMode,
}: {
  assets: CloudinaryAsset[]
  isAdminMode: boolean
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoAdvanceResetKey, setAutoAdvanceResetKey] = useState(0)

  useEffect(() => {
    setCurrentIndex(0)
  }, [assets])

  useEffect(() => {
    if (assets.length <= 1) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % assets.length)
    }, 3500)

    return () => window.clearInterval(timer)
  }, [assets.length, autoAdvanceResetKey])

  if (assets.length === 0) {
    return null
  }

  const activeIndex = Math.min(currentIndex, assets.length - 1)

  function resetAutoAdvanceCounter() {
    setAutoAdvanceResetKey((key) => key + 1)
  }

  function showPreviousAsset() {
    setCurrentIndex((index) => (index === 0 ? assets.length - 1 : index - 1))
    resetAutoAdvanceCounter()
  }

  function showNextAsset() {
    setCurrentIndex((index) => (index + 1) % assets.length)
    resetAutoAdvanceCounter()
  }

  function showAssetAtIndex(index: number) {
    setCurrentIndex(index)
    resetAutoAdvanceCounter()
  }

  return (
    <section
      aria-label="Homepage carousel"
      className="relative mt-1 mb-8 overflow-hidden bg-muted md:mb-12"
    >
      <div className="relative h-[clamp(34rem,72svh,48rem)] sm:h-[clamp(36rem,78svh,52rem)] lg:h-[clamp(38rem,82svh,58rem)]">
        {assets.map((asset, index) => {
          const shootParams = getHomeCarouselShootParams(asset)
          const image = (
            <ProgressiveImage
              src={getHomeCarouselImageUrl(asset)}
              srcSet={getHomeCarouselImageSrcSet(asset)}
              sizes={HOME_CAROUSEL_IMAGE_SIZES}
              alt={asset.displayName}
              className="absolute inset-0 size-full object-cover"
              {...getImageLoadingProps(index === activeIndex)}
            />
          )

          return (
            <div
              key={asset.assetId}
              aria-hidden={index !== activeIndex}
              className="absolute inset-0 transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(${(index - activeIndex) * 100}%)`,
              }}
            >
              {shootParams ? (
                <Link
                  to={getMediaShootRoute(isAdminMode)}
                  params={shootParams}
                  tabIndex={index === activeIndex ? undefined : -1}
                  aria-label={`Open ${asset.shootName} shoot`}
                  className="absolute inset-0 block cursor-pointer ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {image}
                </Link>
              ) : (
                image
              )}
            </div>
          )
        })}
      </div>
      {assets.length > 1 ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 left-3 z-10 -translate-y-1/2 border border-white/20 bg-black/35 text-white backdrop-blur hover:bg-white/15 hover:text-white active:not-aria-[haspopup]:!-translate-y-1/2"
            aria-label="Show previous carousel photo"
            onClick={showPreviousAsset}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-3 z-10 -translate-y-1/2 border border-white/20 bg-black/35 text-white backdrop-blur hover:bg-white/15 hover:text-white active:not-aria-[haspopup]:!-translate-y-1/2"
            aria-label="Show next carousel photo"
            onClick={showNextAsset}
          >
            <ChevronRightIcon />
          </Button>
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
            {assets.map((asset, index) => (
              <button
                key={asset.assetId}
                type="button"
                className={cn(
                  "h-1.5 rounded-full bg-white/65 transition-all hover:bg-white",
                  index === activeIndex ? "w-6 bg-white" : "w-1.5"
                )}
                aria-label={`Show carousel photo ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={() => showAssetAtIndex(index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

function getHomeCarouselShootParams(asset: CloudinaryAsset) {
  if (!asset.categoryName || !asset.shootName) {
    return undefined
  }

  return {
    category: toMediaRouteSegment(asset.categoryName),
    shoot: toMediaRouteSegment(asset.shootName),
  }
}

function getHomeCarouselImageUrl(asset: CloudinaryAsset) {
  if (asset.resourceType !== "image") {
    return asset.previewUrl || asset.secureUrl || asset.thumbnailUrl
  }

  const width = getHomeCarouselImageWidths(asset).at(-1) ?? 3200

  return withCloudinaryDeliveryTransformation(
    asset.secureUrl,
    `c_limit,w_${width}/f_auto/q_auto:best`
  )
}

function getHomeCarouselImageSrcSet(asset: CloudinaryAsset) {
  if (asset.resourceType !== "image") {
    return undefined
  }

  return getHomeCarouselImageWidths(asset)
    .map(
      (width) =>
        `${withCloudinaryDeliveryTransformation(
          asset.secureUrl,
          `c_limit,w_${width}/f_auto/q_auto:best`
        )} ${width}w`
    )
    .join(", ")
}

function getHomeCarouselImageWidths(asset: CloudinaryAsset) {
  const sourceWidth =
    typeof asset.width === "number" && Number.isFinite(asset.width)
      ? Math.round(asset.width)
      : undefined

  if (!sourceWidth || sourceWidth <= 0) {
    return [...HOME_CAROUSEL_IMAGE_WIDTHS]
  }

  const maximumWidth = Math.min(sourceWidth, 3200)
  const widths: number[] = HOME_CAROUSEL_IMAGE_WIDTHS.filter(
    (width) => width < maximumWidth
  )

  widths.push(maximumWidth)

  return widths
}

function withCloudinaryDeliveryTransformation(
  url: string,
  transformation: string
) {
  const uploadMarker = "/upload/"
  const uploadIndex = url.indexOf(uploadMarker)

  if (uploadIndex === -1) {
    return url
  }

  return `${url.slice(
    0,
    uploadIndex + uploadMarker.length
  )}${transformation}/${url.slice(uploadIndex + uploadMarker.length)}`
}

function CategoryGrid({
  canOrganizeCategories,
  categories,
  categoryDropTarget,
  draggingCategoryPath,
  isAdminMode,
  isBusy,
  onCategoryDragEnd,
  onCategoryDragOver,
  onCategoryDragStart,
  onCategoryDrop,
}: {
  canOrganizeCategories: boolean
  categories: CloudinaryHome["categories"]
  categoryDropTarget: CategoryDropTarget | null
  draggingCategoryPath: string | null
  isAdminMode: boolean
  isBusy: boolean
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
          onCategoryDragEnd={onCategoryDragEnd}
          onCategoryDragOver={onCategoryDragOver}
          onCategoryDragStart={onCategoryDragStart}
          onCategoryDrop={onCategoryDrop}
        />
      ))}
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
  onCategoryDragEnd,
  onCategoryDragOver,
  onCategoryDragStart,
  onCategoryDrop,
}: {
  category: CloudinaryHome["categories"][number]
  canOrganizeCategories: boolean
  dropPosition: CategoryDropPosition | null
  isDragging: boolean
  isAdminMode: boolean
  isBusy: boolean
  isPriority: boolean
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
        isDragging ? "opacity-45 ring-2 ring-brand/50" : ""
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
        to={getMediaCategoryRoute(isAdminMode)}
        params={{ category: toMediaRouteSegment(category.name) }}
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
            <h2 className="font-sans text-xs leading-tight font-semibold tracking-[0.12em] uppercase sm:text-sm">
              {category.name}
            </h2>
            <p className="mt-0.5 text-[0.625rem] leading-tight font-medium tracking-[0.12em] text-white/70 uppercase sm:text-[0.6875rem]">
              {category.shootCount} shoots
            </p>
          </div>
        </div>
      </Link>
    </article>
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
