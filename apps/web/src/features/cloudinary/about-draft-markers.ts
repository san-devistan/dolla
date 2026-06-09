type InlineTextSegment = {
  bold: boolean
  id: string
  text: string
}

function getInlineTextSegments(text: string): InlineTextSegment[] {
  const segments: InlineTextSegment[] = []
  const boldPattern = /\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g
  let cursor = 0
  let match = boldPattern.exec(text)

  while (match) {
    if (match.index > cursor) {
      segments.push({
        bold: false,
        id: `text-${cursor}-${match.index}`,
        text: text.slice(cursor, match.index),
      })
    }

    segments.push({
      bold: true,
      id: `bold-${match.index}-${match.index + match[0].length}`,
      text: match[1] ?? "",
    })
    cursor = match.index + match[0].length
    match = boldPattern.exec(text)
  }

  if (cursor < text.length) {
    segments.push({
      bold: false,
      id: `text-${cursor}-${text.length}`,
      text: text.slice(cursor),
    })
  }

  return segments.length > 0
    ? segments
    : [{ bold: false, id: "text-0-0", text }]
}

function stripBlockDraftMarkers(blockText: string) {
  const headingText = getHeadingDraftText(blockText.trim())
  const text = headingText ?? blockText.trim()
  const boldText = getWholeBoldDraftText(text)

  return (boldText ?? text).trim()
}

function stripAllDraftMarkers(blockText: string) {
  return stripHeadingMarker(blockText)
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .trim()
}

function stripHeadingMarker(blockText: string) {
  return (getHeadingDraftText(blockText.trim()) ?? blockText.trim()).trim()
}

function getHeadingDraftText(blockText: string) {
  return blockText.match(/^#{1,2}\s+([\s\S]+)$/)?.[1]?.trim()
}

function getWholeBoldDraftText(blockText: string) {
  return blockText.match(/^\*\*([\s\S]+)\*\*$/)?.[1]?.trim()
}

function getAboutBlockId(index: number, text: string) {
  return `about-${index}-${stripAllDraftMarkers(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)}`
}

export {
  getAboutBlockId,
  getHeadingDraftText,
  getInlineTextSegments,
  getWholeBoldDraftText,
  stripAllDraftMarkers,
  stripBlockDraftMarkers,
  stripHeadingMarker,
}
export type { InlineTextSegment }
