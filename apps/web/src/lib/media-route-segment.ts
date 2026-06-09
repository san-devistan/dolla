function toMediaRouteSegment(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-")
}

function mediaRouteSegmentMatchesName(routeSegment: string, name: string) {
  const decodedRouteSegment = decodeMediaRouteSegment(routeSegment)

  return (
    decodedRouteSegment === name ||
    toMediaRouteSegment(decodedRouteSegment) === toMediaRouteSegment(name)
  )
}

function decodeMediaRouteSegment(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export {
  decodeMediaRouteSegment,
  mediaRouteSegmentMatchesName,
  toMediaRouteSegment,
}
