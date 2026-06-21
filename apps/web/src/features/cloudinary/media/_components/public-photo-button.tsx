import { ProgressiveImage } from "@/features/cloudinary/media/_components/progressive-image"
import {
  MASONRY_IMAGE_SIZES,
  getImageLoadingProps,
} from "@/features/cloudinary/media/_lib/image-delivery"
import {
  getAssetFrameClass,
  preloadViewerAssetsAround,
} from "@/features/cloudinary/media/_lib/shoot-gallery-utils"
import { useStableCallback } from "@/features/cloudinary/shared/use-stable-callback"
import type { CloudinaryAsset } from "@/lib/cloudinary.server"
import { cn } from "@workspace/ui/lib/utils"

function PublicPhotoButton({
  asset,
  isPriority,
  visualAssets,
  onOpenAsset,
}: {
  asset: CloudinaryAsset
  isPriority: boolean
  visualAssets: CloudinaryAsset[]
  onOpenAsset: (assetId: string) => void
}) {
  const preloadAsset = useStableCallback(() => {
    preloadViewerAssetsAround(visualAssets, asset.assetId)
  })
  const openAsset = useStableCallback(() => {
    preloadAsset()
    onOpenAsset(asset.assetId)
  })

  return (
    <button
      type="button"
      className={cn(
        "group relative block w-full overflow-hidden bg-muted text-left",
        getAssetFrameClass(asset)
      )}
      onClick={openAsset}
      onFocus={preloadAsset}
      onPointerDown={preloadAsset}
      onPointerEnter={preloadAsset}
    >
      <ProgressiveImage
        src={asset.thumbnailUrl}
        srcSet={asset.thumbnailSrcSet}
        sizes={MASONRY_IMAGE_SIZES}
        alt={asset.displayName}
        className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
        {...getImageLoadingProps(isPriority)}
      />
      <span className="sr-only">Open {asset.displayName}</span>
    </button>
  )
}

export { PublicPhotoButton }
