const CARD_IMAGE_SIZES =
  "(min-width: 1540px) 480px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
const MASONRY_IMAGE_SIZES =
  "(min-width: 1540px) 385px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"

function getImageLoadingProps(isPriority: boolean) {
  return {
    decoding: "async" as const,
    fetchPriority: isPriority ? ("high" as const) : ("auto" as const),
    loading: isPriority ? ("eager" as const) : ("lazy" as const),
  }
}

export { CARD_IMAGE_SIZES, MASONRY_IMAGE_SIZES, getImageLoadingProps }
