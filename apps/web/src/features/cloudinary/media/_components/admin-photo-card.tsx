import { ProgressiveImage } from "@/features/cloudinary/media/_components/progressive-image"
import {
  getAdminPhotoCardClass,
  useAdminPhotoActionHandlers,
  useAdminPhotoDragHandlers,
  useAdminPhotoSelectionHandlers,
  type AdminPhotoCardHandlers,
  type AdminPhotoCardState,
} from "@/features/cloudinary/media/_lib/admin-photo-card-controller"
import {
  MASONRY_IMAGE_SIZES,
  getImageLoadingProps,
} from "@/features/cloudinary/media/_lib/image-delivery"
import {
  getAssetDimensionLabel,
  getAssetFrameClass,
  getAssetTypeLabel,
} from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import type { CloudinaryAsset } from "@/lib/cloudinary.server"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { cn } from "@workspace/ui/lib/utils"
import { HomeIcon, ImageIcon, StarIcon } from "lucide-react"
import type { MouseEvent } from "react"

function AdminPhotoCard({
  asset,
  canOrganizeAssets,
  handlers,
  state,
}: {
  asset: CloudinaryAsset
  canOrganizeAssets: boolean
  handlers: AdminPhotoCardHandlers
  state: AdminPhotoCardState
}) {
  const dragHandlers = useAdminPhotoDragHandlers({
    assetId: asset.assetId,
    handlers,
  })
  const selectionHandlers = useAdminPhotoSelectionHandlers({
    assetId: asset.assetId,
    handlers,
  })
  const actionHandlers = useAdminPhotoActionHandlers({
    assetId: asset.assetId,
    handlers,
    isHomeCarouselAsset: state.isHomeCarouselAsset,
  })

  return (
    <article
      draggable={canOrganizeAssets && !state.isBusy}
      className={getAdminPhotoCardClass({ canOrganizeAssets, state })}
      {...dragHandlers.article}
    >
      <div className="relative overflow-hidden bg-muted">
        <AdminPhotoImageButton
          asset={asset}
          canOrganizeAssets={canOrganizeAssets}
          dragHandlers={dragHandlers.button}
          state={state}
          onSelectionClick={selectionHandlers.onSelectionClick}
        />
        <AdminPhotoCheckbox
          isBusy={state.isBusy}
          isSelected={state.isSelected}
          onCheckedChange={selectionHandlers.onCheckedChange}
          onClick={selectionHandlers.stopClickPropagation}
        />
        <AdminPhotoBadges asset={asset} />
        <HomeCarouselButton
          canOrganizeAssets={canOrganizeAssets}
          isBusy={state.isBusy}
          isHomeCarouselAsset={state.isHomeCarouselAsset}
          onClick={actionHandlers.onHomeCarouselClick}
        />
        {state.showCoverControl ? (
          <CoverButton
            canOrganizeAssets={canOrganizeAssets}
            isBusy={state.isBusy}
            isCover={state.isCover}
            onClick={actionHandlers.onCoverClick}
          />
        ) : null}
      </div>
    </article>
  )
}

function AdminPhotoImageButton({
  asset,
  canOrganizeAssets,
  dragHandlers,
  state,
  onSelectionClick,
}: {
  asset: CloudinaryAsset
  canOrganizeAssets: boolean
  dragHandlers: ReturnType<typeof useAdminPhotoDragHandlers>["button"]
  state: AdminPhotoCardState
  onSelectionClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "group/image relative block w-full cursor-pointer text-left disabled:cursor-not-allowed",
        getAssetFrameClass(asset)
      )}
      draggable={canOrganizeAssets && !state.isBusy}
      disabled={state.isBusy}
      aria-pressed={state.isSelected}
      onClick={onSelectionClick}
      {...dragHandlers}
    >
      {asset.thumbnailUrl ? (
        <ProgressiveImage
          src={asset.thumbnailUrl}
          srcSet={asset.thumbnailSrcSet}
          sizes={MASONRY_IMAGE_SIZES}
          alt={asset.displayName}
          draggable={false}
          className={cn(
            "absolute inset-0 size-full object-cover transition duration-300",
            state.isSelected
              ? "scale-[1.015] brightness-90"
              : "group-hover/image:scale-[1.035]"
          )}
          {...getImageLoadingProps(state.isPriority)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="size-7 text-muted-foreground" />
        </div>
      )}
      <span className="sr-only">
        {state.isSelected ? "Deselect photo" : "Select photo"}
      </span>
    </button>
  )
}

function AdminPhotoCheckbox({
  isBusy,
  isSelected,
  onCheckedChange,
  onClick,
}: {
  isBusy: boolean
  isSelected: boolean
  onCheckedChange: (checked: boolean) => void
  onClick: (event: MouseEvent<HTMLElement>) => void
}) {
  return (
    <Checkbox
      checked={isSelected}
      disabled={isBusy}
      aria-label={isSelected ? "Deselect photo" : "Select photo"}
      className={cn(
        "absolute top-3 left-3 z-20 size-5 border-background/80 bg-background/90 text-primary-foreground shadow-sm transition-opacity",
        isSelected
          ? "opacity-100"
          : "opacity-0 group-hover/photo:opacity-100 focus-visible:opacity-100"
      )}
      onClick={onClick}
      onCheckedChange={onCheckedChange}
    />
  )
}

function AdminPhotoBadges({ asset }: { asset: CloudinaryAsset }) {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5">
      <span className="bg-background/90 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-foreground uppercase shadow-sm backdrop-blur">
        {getAssetTypeLabel(asset)}
      </span>
      <span className="bg-background/90 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-foreground uppercase shadow-sm backdrop-blur">
        {getAssetDimensionLabel(asset)}
      </span>
    </div>
  )
}

function HomeCarouselButton({
  canOrganizeAssets,
  isBusy,
  isHomeCarouselAsset,
  onClick,
}: {
  canOrganizeAssets: boolean
  isBusy: boolean
  isHomeCarouselAsset: boolean
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Button
      type="button"
      variant={isHomeCarouselAsset ? "brand" : "secondary"}
      size="sm"
      className={cn(
        "absolute top-3 right-3 z-20 h-8 px-2.5 text-xs shadow-sm backdrop-blur transition-opacity",
        isHomeCarouselAsset
          ? "opacity-100"
          : "bg-background/90 opacity-0 group-hover/photo:opacity-100 focus-visible:opacity-100"
      )}
      aria-pressed={isHomeCarouselAsset}
      aria-label={
        isHomeCarouselAsset
          ? "Remove from homepage carousel"
          : "Use in homepage carousel"
      }
      disabled={!canOrganizeAssets || isBusy}
      onClick={onClick}
    >
      <HomeIcon data-icon="inline-start" />
      Home
    </Button>
  )
}

function CoverButton({
  canOrganizeAssets,
  isBusy,
  isCover,
  onClick,
}: {
  canOrganizeAssets: boolean
  isBusy: boolean
  isCover: boolean
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <Button
      type="button"
      variant={isCover ? "brand" : "secondary"}
      size="sm"
      className={cn(
        "absolute right-3 bottom-3 z-20 h-8 px-2.5 text-xs shadow-sm backdrop-blur transition-opacity",
        isCover
          ? "opacity-100"
          : "bg-background/90 opacity-0 group-hover/photo:opacity-100 focus-visible:opacity-100"
      )}
      disabled={!canOrganizeAssets || isBusy}
      onClick={onClick}
    >
      <StarIcon data-icon="inline-start" />
      Cover
    </Button>
  )
}

export { AdminPhotoCard }
export type { AdminPhotoCardHandlers, AdminPhotoCardState }
