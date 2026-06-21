import {
  usePhotoViewerKeyboard,
  usePhotoViewerPreload,
  usePhotoViewerState,
  useSelectAdjacentAsset,
} from "@/features/cloudinary/media/_lib/photo-viewer-controller"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryAsset } from "@/lib/cloudinary.server"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react"
import { type MouseEvent } from "react"

function PhotoViewer({
  activeAssetId,
  assets,
  onClose,
  onSelectAsset,
}: {
  activeAssetId: string | null
  assets: CloudinaryAsset[]
  onClose: () => void
  onSelectAsset: (assetId: string) => void
}) {
  const viewer = usePhotoViewerState({ activeAssetId, assets })
  const adjacentAssetSelection = useSelectAdjacentAsset({
    activeAsset: viewer.activeAsset,
    assets,
    onSelectAsset,
  })

  usePhotoViewerKeyboard({
    activeAssetId,
    assets,
    onClose,
    onSelectAsset,
  })
  usePhotoViewerPreload({ activeAssetId, assets })

  if (!viewer.activeAsset || !viewer.imageUrl) {
    return null
  }

  return (
    <PhotoViewerDialog
      hasMultipleAssets={assets.length > 1}
      isImageLoaded={viewer.isImageLoaded}
      viewerAsset={viewer.activeAsset}
      viewerImageUrl={viewer.imageUrl}
      onClose={onClose}
      onImageSettled={viewer.markImageLoaded}
      onNextAsset={adjacentAssetSelection.next}
      onPreviousAsset={adjacentAssetSelection.previous}
    />
  )
}

function PhotoViewerDialog({
  hasMultipleAssets,
  isImageLoaded,
  viewerAsset,
  viewerImageUrl,
  onClose,
  onImageSettled,
  onNextAsset,
  onPreviousAsset,
}: {
  hasMultipleAssets: boolean
  isImageLoaded: boolean
  viewerAsset: CloudinaryAsset
  viewerImageUrl: string
  onClose: () => void
  onImageSettled: () => void
  onNextAsset: () => void
  onPreviousAsset: () => void
}) {
  const handleBackdropClick = useStableCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose()
      }
    }
  )

  return (
    <dialog
      open
      aria-modal="true"
      aria-label={`${viewerAsset.displayName} photo viewer`}
      className="fixed inset-0 z-[60] m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-black/95 p-0 text-white"
    >
      <div
        role="presentation"
        className="relative flex h-full w-full items-center justify-center px-3 py-4 sm:px-16 sm:py-6"
        onClick={handleBackdropClick}
      >
        <PhotoViewerCloseButton onClose={onClose} />
        {hasMultipleAssets ? (
          <PhotoViewerNavButton
            direction="previous"
            onClick={onPreviousAsset}
          />
        ) : null}
        <PhotoViewerImage
          isImageLoaded={isImageLoaded}
          viewerAsset={viewerAsset}
          viewerImageUrl={viewerImageUrl}
          onImageSettled={onImageSettled}
        />
        {hasMultipleAssets ? (
          <PhotoViewerNavButton direction="next" onClick={onNextAsset} />
        ) : null}
      </div>
    </dialog>
  )
}

function PhotoViewerCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="absolute top-3 right-3 z-20 border-white/10 bg-black/35 text-white hover:bg-white/10 hover:text-white sm:top-5 sm:right-5"
      aria-label="Close photo viewer"
      onClick={onClose}
    >
      <XIcon />
    </Button>
  )
}

function PhotoViewerNavButton({
  direction,
  onClick,
}: {
  direction: "next" | "previous"
  onClick: () => void
}) {
  const isPrevious = direction === "previous"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className={cn(
        "absolute z-10 border-white/10 bg-black/35 text-white hover:bg-white/10 hover:text-white",
        isPrevious ? "left-2 sm:left-5" : "right-2 sm:right-5"
      )}
      aria-label={isPrevious ? "Show previous photo" : "Show next photo"}
      onClick={onClick}
    >
      {isPrevious ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </Button>
  )
}

function PhotoViewerImage({
  isImageLoaded,
  viewerAsset,
  viewerImageUrl,
  onImageSettled,
}: {
  isImageLoaded: boolean
  viewerAsset: CloudinaryAsset
  viewerImageUrl: string
  onImageSettled: () => void
}) {
  return (
    <>
      {!isImageLoaded ? (
        <PhotoViewerImagePlaceholder asset={viewerAsset} />
      ) : null}
      <img
        src={viewerImageUrl}
        alt={viewerAsset.displayName}
        className={cn(
          "max-h-full max-w-full object-contain shadow-2xl shadow-black transition-opacity duration-200",
          isImageLoaded ? "opacity-100" : "absolute inset-0 m-auto opacity-0"
        )}
        decoding="async"
        fetchPriority="high"
        loading="eager"
        onError={onImageSettled}
        onLoad={onImageSettled}
      />
    </>
  )
}

function PhotoViewerImagePlaceholder({ asset }: { asset: CloudinaryAsset }) {
  return (
    <>
      <img
        src={asset.thumbnailUrl}
        alt=""
        aria-hidden="true"
        className="max-h-full max-w-full scale-[1.01] object-contain opacity-60 shadow-2xl shadow-black blur-sm transition-opacity duration-200"
      />
      <output className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-white/80">
        <RefreshCwIcon className="size-5 animate-spin" />
        <span className="sr-only">Loading photo</span>
      </output>
    </>
  )
}

export { PhotoViewer }
