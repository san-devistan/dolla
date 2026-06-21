import { ProgressiveImage } from "@/features/cloudinary/media/_components/progressive-image"
import {
  CARD_IMAGE_SIZES,
  getImageLoadingProps,
} from "@/features/cloudinary/media/_lib/image-delivery"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import { getMediaShootRoute } from "@/lib/admin-routes"
import type { CloudinaryShootSummary } from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { cn } from "@workspace/ui/lib/utils"
import { StarIcon } from "lucide-react"
import { type DragEvent, type MouseEvent, useMemo } from "react"

type ShootCardMode =
  | {
      type: "admin"
      canOrganize: boolean
      draggingShootPath: string | null
      isBusy: boolean
      isCategoryCover: boolean
      isSelected: boolean
      isSwapTarget: boolean
    }
  | {
      type: "public"
      isCategoryCover: boolean
    }

type ShootCardHandlers = {
  onDragEnd: () => void
  onSetCategoryCover: (shootPath: string) => void
  onShootDragOver: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDragStart: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootDrop: (event: DragEvent<HTMLElement>, shootPath: string) => void
  onShootSelectionChange: (shootPath: string, selected?: boolean) => void
}

function ShootCard({
  handlers,
  index,
  isAdminMode,
  mode,
  shoot,
}: {
  handlers: ShootCardHandlers
  index: number
  isAdminMode: boolean
  mode: ShootCardMode
  shoot: CloudinaryShootSummary
}) {
  const shootRouteParams = useMemo(
    () => ({
      category: toMediaRouteSegment(shoot.categoryName),
      shoot: toMediaRouteSegment(shoot.name),
    }),
    [shoot.categoryName, shoot.name]
  )
  const dragHandlers = useShootCardDragHandlers({
    handlers,
    isAdminMode,
    shoot,
  })
  const adminHandlers = useShootCardAdminHandlers({ handlers, shoot })
  const draggable = mode.type === "admin" && mode.canOrganize && !mode.isBusy

  return (
    <article
      draggable={draggable}
      className={getShootCardClass({ draggable, mode, shoot })}
      onDragStart={dragHandlers.handleDragStart}
      onDragOver={dragHandlers.handleDragOver}
      onDrop={dragHandlers.handleDrop}
      onDragEnd={handlers.onDragEnd}
    >
      {mode.type === "admin" && mode.isSwapTarget ? (
        <div className="pointer-events-none absolute inset-2 z-30 border-2 border-brand shadow-[0_0_0_1px_hsl(var(--background)),0_0_18px_hsl(var(--brand)/0.6)]" />
      ) : null}
      <Link
        to={getMediaShootRoute(isAdminMode)}
        params={shootRouteParams}
        draggable={draggable}
        className="block w-full text-left ring-offset-background transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onDragStart={dragHandlers.handleLinkDragStart}
        onDragOver={dragHandlers.handleLinkDragOver}
        onDrop={dragHandlers.handleLinkDrop}
        onDragEnd={dragHandlers.handleLinkDragEnd}
      >
        <ShootPreview index={index} mode={mode} shoot={shoot} />
      </Link>
      {mode.type === "admin" ? (
        <ShootCardAdminControls handlers={adminHandlers} mode={mode} />
      ) : null}
    </article>
  )
}

function ShootPreview({
  index,
  mode,
  shoot,
}: {
  index: number
  mode: ShootCardMode
  shoot: CloudinaryShootSummary
}) {
  return (
    <div className="relative aspect-[3/4]">
      {shoot.cover ? (
        <ProgressiveImage
          src={shoot.cover.thumbnailUrl}
          srcSet={shoot.cover.thumbnailSrcSet}
          sizes={CARD_IMAGE_SIZES}
          alt={shoot.name}
          draggable={false}
          className={cn(
            "absolute inset-0 size-full object-cover transition duration-300",
            mode.type === "admin" && mode.isSelected
              ? "scale-[1.015] brightness-90"
              : "group-hover:scale-[1.035]"
          )}
          {...getImageLoadingProps(index < 3)}
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
  )
}

function ShootCardAdminControls({
  handlers,
  mode,
}: {
  handlers: ReturnType<typeof useShootCardAdminHandlers>
  mode: Extract<ShootCardMode, { type: "admin" }>
}) {
  return (
    <>
      <Checkbox
        checked={mode.isSelected}
        disabled={mode.isBusy}
        aria-label={mode.isSelected ? "Deselect shoot" : "Select shoot"}
        className={cn(
          "absolute top-3 left-3 z-20 size-5 border-background/80 bg-background/90 text-primary-foreground shadow-sm transition-opacity",
          mode.isSelected
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        )}
        onClick={handlers.stopClickPropagation}
        onCheckedChange={handlers.handleCheckedChange}
      />
      <Button
        type="button"
        variant={mode.isCategoryCover ? "brand" : "secondary"}
        size="sm"
        className={cn(
          "absolute right-3 bottom-3 z-20 h-8 px-2.5 text-xs shadow-sm backdrop-blur transition-opacity",
          mode.isCategoryCover
            ? "opacity-100"
            : "bg-background/90 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        )}
        disabled={!mode.canOrganize || mode.isBusy}
        onClick={handlers.handleSetCategoryCover}
      >
        <StarIcon data-icon="inline-start" />
        Cover
      </Button>
    </>
  )
}

function useShootCardDragHandlers({
  handlers,
  isAdminMode,
  shoot,
}: {
  handlers: ShootCardHandlers
  isAdminMode: boolean
  shoot: CloudinaryShootSummary
}) {
  return {
    handleDragOver: useStableCallback((event: DragEvent<HTMLElement>) => {
      handlers.onShootDragOver(event, shoot.path)
    }),
    handleDragStart: useStableCallback((event: DragEvent<HTMLElement>) => {
      handlers.onShootDragStart(event, shoot.path)
    }),
    handleDrop: useStableCallback((event: DragEvent<HTMLElement>) => {
      handlers.onShootDrop(event, shoot.path)
    }),
    handleLinkDragEnd: useStableCallback((event: DragEvent<HTMLElement>) => {
      event.stopPropagation()

      if (isAdminMode) {
        handlers.onDragEnd()
      }
    }),
    handleLinkDragOver: useStableCallback((event: DragEvent<HTMLElement>) => {
      event.stopPropagation()

      if (isAdminMode) {
        handlers.onShootDragOver(event, shoot.path)
      }
    }),
    handleLinkDragStart: useStableCallback((event: DragEvent<HTMLElement>) => {
      event.stopPropagation()

      if (isAdminMode) {
        handlers.onShootDragStart(event, shoot.path)
      }
    }),
    handleLinkDrop: useStableCallback((event: DragEvent<HTMLElement>) => {
      event.stopPropagation()

      if (isAdminMode) {
        handlers.onShootDrop(event, shoot.path)
      }
    }),
  }
}

function useShootCardAdminHandlers({
  handlers,
  shoot,
}: {
  handlers: ShootCardHandlers
  shoot: CloudinaryShootSummary
}) {
  return {
    handleCheckedChange: useStableCallback((checked: boolean) => {
      handlers.onShootSelectionChange(shoot.path, checked)
    }),
    handleSetCategoryCover: useStableCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        handlers.onSetCategoryCover(shoot.path)
      }
    ),
    stopClickPropagation: useStableCallback(
      (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation()
      }
    ),
  }
}

function getShootCardClass({
  draggable,
  mode,
  shoot,
}: {
  draggable: boolean
  mode: ShootCardMode
  shoot: CloudinaryShootSummary
}) {
  return cn(
    "group relative overflow-hidden border bg-muted transition duration-200",
    draggable ? "cursor-grab active:cursor-grabbing" : "",
    mode.type === "admin" && mode.isSwapTarget ? "ring-2 ring-brand/70" : "",
    mode.type === "admin" && mode.isSelected ? "ring-2 ring-brand/70" : "",
    mode.type === "admin" && mode.draggingShootPath === shoot.path
      ? "opacity-45 ring-2 ring-brand/50"
      : ""
  )
}

export { ShootCard }
export type { ShootCardHandlers, ShootCardMode }
