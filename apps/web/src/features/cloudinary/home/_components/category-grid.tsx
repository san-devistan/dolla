import type { CategoryDropTarget } from "@/features/cloudinary/home/_lib/controller"
import { ProgressiveImage } from "@/features/cloudinary/media/_components/progressive-image"
import {
  CARD_IMAGE_SIZES,
  getImageLoadingProps,
} from "@/features/cloudinary/media/_lib/image-delivery"
import { getMediaCategoryRoute } from "@/lib/admin-routes"
import type { CloudinaryHome } from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { Link } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"
import { type DragEvent, useCallback, useMemo } from "react"

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
    <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2 sm:gap-x-14 sm:gap-y-12 lg:grid-cols-3">
      {categories.map((category, index) => (
        <CategoryCard
          key={category.path}
          category={category}
          canOrganizeCategories={canOrganizeCategories}
          categoryDropTarget={categoryDropTarget}
          draggingCategoryPath={draggingCategoryPath}
          isAdminMode={isAdminMode}
          isBusy={isBusy}
          index={index}
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
  categoryDropTarget,
  draggingCategoryPath,
  isAdminMode,
  isBusy,
  index,
  onCategoryDragEnd,
  onCategoryDragOver,
  onCategoryDragStart,
  onCategoryDrop,
}: {
  category: CloudinaryHome["categories"][number]
  canOrganizeCategories: boolean
  categoryDropTarget: CategoryDropTarget | null
  draggingCategoryPath: string | null
  isAdminMode: boolean
  isBusy: boolean
  index: number
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
  const draggable = isAdminMode && canOrganizeCategories && !isBusy
  const isSwapTarget =
    categoryDropTarget?.categoryPath === category.path &&
    draggingCategoryPath !== category.path
  const isDragging = draggingCategoryPath === category.path
  const routeParams = useMemo(
    () => ({ category: toMediaRouteSegment(category.name) }),
    [category.name]
  )
  const handleArticleDragStart = useCallback(
    (event: DragEvent<HTMLElement>) => {
      onCategoryDragStart(event, category.path)
    },
    [category.path, onCategoryDragStart]
  )
  const handleArticleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      onCategoryDragOver(event, category.path)
    },
    [category.path, onCategoryDragOver]
  )
  const handleArticleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      onCategoryDrop(event, category.path)
    },
    [category.path, onCategoryDrop]
  )
  const handleLinkDragStart = useCategoryLinkDragHandler({
    categoryPath: category.path,
    isAdminMode,
    onCategoryDragStart,
  })
  const handleLinkDragOver = useCategoryLinkDragHandler({
    categoryPath: category.path,
    isAdminMode,
    onCategoryDragOver,
  })
  const handleLinkDrop = useCategoryLinkDragHandler({
    categoryPath: category.path,
    isAdminMode,
    onCategoryDrop,
  })
  const handleLinkDragEnd = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.stopPropagation()

      if (isAdminMode) {
        onCategoryDragEnd()
      }
    },
    [isAdminMode, onCategoryDragEnd]
  )

  return (
    <article
      draggable={draggable}
      className={cn(
        "group relative overflow-hidden border bg-muted transition duration-200",
        draggable ? "cursor-grab active:cursor-grabbing" : "",
        isSwapTarget ? "ring-2 ring-brand/70" : "",
        isDragging ? "opacity-45 ring-2 ring-brand/50" : ""
      )}
      onDragStart={handleArticleDragStart}
      onDragOver={handleArticleDragOver}
      onDrop={handleArticleDrop}
      onDragEnd={onCategoryDragEnd}
    >
      {isSwapTarget ? (
        <div className="pointer-events-none absolute inset-2 z-30 border-2 border-brand shadow-[0_0_0_1px_hsl(var(--background)),0_0_18px_hsl(var(--brand)/0.6)]" />
      ) : null}
      <Link
        to={getMediaCategoryRoute(isAdminMode)}
        params={routeParams}
        draggable={draggable}
        className="block w-full text-left ring-offset-background transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onDragStart={handleLinkDragStart}
        onDragOver={handleLinkDragOver}
        onDrop={handleLinkDrop}
        onDragEnd={handleLinkDragEnd}
      >
        <CategoryCardImage category={category} isPriority={index < 3} />
      </Link>
    </article>
  )
}

function useCategoryLinkDragHandler({
  categoryPath,
  isAdminMode,
  onCategoryDragStart,
  onCategoryDragOver,
  onCategoryDrop,
}: {
  categoryPath: string
  isAdminMode: boolean
  onCategoryDragStart?: (
    event: DragEvent<HTMLElement>,
    categoryPath: string
  ) => void
  onCategoryDragOver?: (
    event: DragEvent<HTMLElement>,
    categoryPath: string
  ) => void
  onCategoryDrop?: (event: DragEvent<HTMLElement>, categoryPath: string) => void
}) {
  return useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.stopPropagation()

      if (isAdminMode) {
        onCategoryDragStart?.(event, categoryPath)
        onCategoryDragOver?.(event, categoryPath)
        onCategoryDrop?.(event, categoryPath)
      }
    },
    [
      categoryPath,
      isAdminMode,
      onCategoryDragOver,
      onCategoryDragStart,
      onCategoryDrop,
    ]
  )
}

function CategoryCardImage({
  category,
  isPriority,
}: {
  category: CloudinaryHome["categories"][number]
  isPriority: boolean
}) {
  return (
    <div className="relative aspect-[3/4]">
      {category.cover ? (
        <ProgressiveImage
          src={category.cover.thumbnailUrl}
          srcSet={category.cover.thumbnailSrcSet}
          sizes={CARD_IMAGE_SIZES}
          alt={category.name}
          draggable={false}
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
          {getCategoryCountLabel(category)}
        </p>
      </div>
    </div>
  )
}

function getCategoryCountLabel(category: CloudinaryHome["categories"][number]) {
  if (category.isDirectPhotoCategory) {
    return `${category.assetCount} photo${category.assetCount === 1 ? "" : "s"}`
  }

  return `${category.shootCount} shoot${category.shootCount === 1 ? "" : "s"}`
}

export { CategoryGrid }
