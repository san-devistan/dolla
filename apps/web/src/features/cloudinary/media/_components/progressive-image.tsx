import { cn } from "@workspace/ui/lib/utils"
import {
  type ComponentPropsWithoutRef,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

type ProgressiveImageProps = Omit<
  ComponentPropsWithoutRef<"img">,
  "alt" | "src"
> & {
  alt: string
  placeholderSrc?: string
  src: string
}

const loadedImageUrls = new Set<string>()

function ProgressiveImage({ src, ...props }: ProgressiveImageProps) {
  return <ProgressiveImageForSrc key={src} src={src} {...props} />
}

function ProgressiveImageForSrc({
  alt,
  className,
  onError,
  onLoad,
  placeholderSrc,
  src,
  ...props
}: ProgressiveImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [isLoaded, setIsLoaded] = useState(() => loadedImageUrls.has(src))
  const resolvedPlaceholderSrc =
    placeholderSrc || getCloudinaryBlurPlaceholderUrl(src)

  const markImageSettled = useCallback(() => {
    loadedImageUrls.add(src)
    setIsLoaded(true)
  }, [src])
  const markImageSettledRef = useRef(markImageSettled)

  useEffect(() => {
    markImageSettledRef.current = markImageSettled
  })

  useEffect(() => {
    const markCurrentImageSettled = () => {
      markImageSettledRef.current()
    }
    const image = imageRef.current

    if (!image) {
      return undefined
    }

    if (image.complete) {
      markCurrentImageSettled()
      return undefined
    }

    image.addEventListener("load", markCurrentImageSettled)
    image.addEventListener("error", markCurrentImageSettled)

    return () => {
      image.removeEventListener("load", markCurrentImageSettled)
      image.removeEventListener("error", markCurrentImageSettled)
    }
  }, [])

  const handleImageSettled = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      markImageSettled()
      onLoad?.(event)
    },
    [markImageSettled, onLoad]
  )

  const handleImageError = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      markImageSettled()
      onError?.(event)
    },
    [markImageSettled, onError]
  )

  return (
    <>
      {!isLoaded ? (
        <img
          src={resolvedPlaceholderSrc}
          alt=""
          aria-hidden="true"
          className={cn(
            className,
            "scale-[1.02] opacity-70 blur-md transition duration-300"
          )}
          draggable={false}
        />
      ) : null}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={cn(
          className,
          "transition duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onError={handleImageError}
        onLoad={handleImageSettled}
        {...props}
      />
    </>
  )
}

function getCloudinaryBlurPlaceholderUrl(src: string) {
  const uploadMarker = "/upload/"
  const uploadIndex = src.indexOf(uploadMarker)

  if (uploadIndex === -1) {
    return src
  }

  return `${src.slice(
    0,
    uploadIndex + uploadMarker.length
  )}c_limit,w_48/e_blur:900/f_auto/q_30/${src.slice(
    uploadIndex + uploadMarker.length
  )}`
}

export { ProgressiveImage }
