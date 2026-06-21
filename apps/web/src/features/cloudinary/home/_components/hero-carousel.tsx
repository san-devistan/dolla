import { ProgressiveImage } from "@/features/cloudinary/media/_components/progressive-image"
import { getImageLoadingProps } from "@/features/cloudinary/media/_lib/image-delivery"
import { getMediaCategoryRoute, getMediaShootRoute } from "@/lib/admin-routes"
import type { CloudinaryAsset } from "@/lib/cloudinary.server"
import { isDirectPhotoCategoryName } from "@/lib/direct-photo-category"
import { toMediaRouteSegment } from "@/lib/media-route-segment"
import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

const HOME_CAROUSEL_IMAGE_SIZES = "(min-width: 1540px) 1540px, 100vw"
const HOME_CAROUSEL_IMAGE_WIDTHS = [960, 1280, 1600, 2200, 3200] as const

function HomeHeroCarousel({
  assets,
  isAdminMode,
}: {
  assets: CloudinaryAsset[]
  isAdminMode: boolean
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (assets.length <= 1) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % assets.length)
    }, 3500)

    return () => window.clearInterval(timer)
  }, [assets.length])

  const showPreviousAsset = useCallback(() => {
    setCurrentIndex((index) => (index === 0 ? assets.length - 1 : index - 1))
  }, [assets.length])
  const showNextAsset = useCallback(() => {
    setCurrentIndex((index) => (index + 1) % assets.length)
  }, [assets.length])
  const showAssetAtIndex = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  if (assets.length === 0) {
    return null
  }

  const activeIndex = Math.min(currentIndex, assets.length - 1)

  return (
    <section
      aria-label="Homepage carousel"
      className="relative mt-1 overflow-hidden bg-muted"
    >
      <div className="relative h-[clamp(34rem,72svh,48rem)] sm:h-[clamp(36rem,78svh,52rem)] lg:h-[clamp(38rem,82svh,58rem)]">
        {assets.map((asset, index) => (
          <HomeHeroSlide
            key={asset.assetId}
            activeIndex={activeIndex}
            asset={asset}
            index={index}
            isAdminMode={isAdminMode}
          />
        ))}
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
          <HomeHeroDots
            activeIndex={activeIndex}
            assets={assets}
            onShowAsset={showAssetAtIndex}
          />
        </>
      ) : null}
    </section>
  )
}

function HomeHeroSlide({
  activeIndex,
  asset,
  index,
  isAdminMode,
}: {
  activeIndex: number
  asset: CloudinaryAsset
  index: number
  isAdminMode: boolean
}) {
  const assetRoute = getHomeCarouselAssetRoute(asset, isAdminMode)
  const style = useMemo(
    () => ({ transform: `translateX(${(index - activeIndex) * 100}%)` }),
    [activeIndex, index]
  )
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
      aria-hidden={index !== activeIndex}
      className="absolute inset-0 transition-transform duration-500 ease-out"
      style={style}
    >
      {assetRoute ? (
        <Link
          to={assetRoute.to}
          params={assetRoute.params}
          tabIndex={index === activeIndex ? undefined : -1}
          aria-label={assetRoute.ariaLabel}
          className="absolute inset-0 block cursor-pointer ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  )
}

function HomeHeroDots({
  activeIndex,
  assets,
  onShowAsset,
}: {
  activeIndex: number
  assets: CloudinaryAsset[]
  onShowAsset: (index: number) => void
}) {
  return (
    <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
      {assets.map((asset, index) => (
        <HomeHeroDot
          key={asset.assetId}
          activeIndex={activeIndex}
          index={index}
          onShowAsset={onShowAsset}
        />
      ))}
    </div>
  )
}

function HomeHeroDot({
  activeIndex,
  index,
  onShowAsset,
}: {
  activeIndex: number
  index: number
  onShowAsset: (index: number) => void
}) {
  const handleClick = useCallback(() => {
    onShowAsset(index)
  }, [index, onShowAsset])

  return (
    <button
      type="button"
      className={cn(
        "h-1.5 rounded-full bg-white/65 transition-all hover:bg-white",
        index === activeIndex ? "w-6 bg-white" : "w-1.5"
      )}
      aria-label={`Show carousel photo ${index + 1}`}
      aria-current={index === activeIndex}
      onClick={handleClick}
    />
  )
}

function getHomeCarouselAssetRoute(
  asset: CloudinaryAsset,
  isAdminMode: boolean
) {
  if (!asset.categoryName) {
    return undefined
  }

  if (isDirectPhotoCategoryName(asset.categoryName)) {
    return {
      to: getMediaCategoryRoute(isAdminMode),
      params: { category: toMediaRouteSegment(asset.categoryName) },
      ariaLabel: `Open ${asset.categoryName} category`,
    }
  }

  if (!asset.shootName) {
    return undefined
  }

  return {
    to: getMediaShootRoute(isAdminMode),
    params: {
      category: toMediaRouteSegment(asset.categoryName),
      shoot: toMediaRouteSegment(asset.shootName),
    },
    ariaLabel: `Open ${asset.shootName} shoot`,
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

export { HomeHeroCarousel }
