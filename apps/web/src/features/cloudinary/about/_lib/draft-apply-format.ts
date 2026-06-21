import {
  getHeadingDraftText,
  getWholeBoldDraftText,
  stripAllDraftMarkers,
  stripBlockDraftMarkers,
} from "@/features/cloudinary/about/_lib/draft-markers"
import {
  getBoldRanges,
  getCurrentDraftBlockRange,
  getPartiallyUnboldedText,
  withBlockBoundaries,
} from "@/features/cloudinary/about/_lib/draft-ranges"

type AboutDraftFormat = "bold" | "heading" | "paragraph"

type DraftFormatRange = {
  end: number
  isExactSelection: boolean
  start: number
}

type DraftReplacement = {
  end: number
  start: number
  text: string
}

function applyDraftFormat({
  draftText,
  format,
  selectionEnd,
  selectionStart,
}: {
  draftText: string
  format: AboutDraftFormat
  selectionEnd: number
  selectionStart: number
}) {
  const formatRange = getDraftFormatRange({
    draftText,
    format,
    selectionEnd,
    selectionStart,
  })
  const replacement =
    getToggleReplacement({ draftText, format, formatRange }) ??
    getFormatReplacement({ draftText, format, formatRange })
  const nextText = `${draftText.slice(0, replacement.start)}${replacement.text}${draftText.slice(replacement.end)}`
  const normalizedText = normalizeDraftSpacing(nextText)
  const offsetDelta = normalizedText.length - nextText.length
  const nextSelectionStart = replacement.start
  const nextSelectionEnd = Math.max(
    nextSelectionStart,
    nextSelectionStart + replacement.text.length + offsetDelta
  )

  return {
    text: normalizedText,
    selectionStart: nextSelectionStart,
    selectionEnd: nextSelectionEnd,
  }
}

function getDraftFormatRange({
  draftText,
  format,
  selectionEnd,
  selectionStart,
}: {
  draftText: string
  format: AboutDraftFormat
  selectionEnd: number
  selectionStart: number
}) {
  const normalizedStart = Math.min(selectionStart, selectionEnd)
  const normalizedEnd = Math.max(selectionStart, selectionEnd)

  if (normalizedStart !== normalizedEnd) {
    return {
      start: normalizedStart,
      end: normalizedEnd,
      isExactSelection: true,
    }
  }

  if (format === "bold" && !draftText) {
    return { start: 0, end: 0, isExactSelection: true }
  }

  return {
    ...getCurrentDraftBlockRange(draftText, normalizedStart),
    isExactSelection: false,
  }
}

function getToggleReplacement({
  draftText,
  format,
  formatRange,
}: {
  draftText: string
  format: AboutDraftFormat
  formatRange: DraftFormatRange
}): DraftReplacement | null {
  if (format === "heading") {
    return getHeadingToggleReplacement({ draftText, formatRange })
  }

  if (format === "bold") {
    return getBoldToggleReplacement({ draftText, formatRange })
  }

  return null
}

function getHeadingToggleReplacement({
  draftText,
  formatRange,
}: {
  draftText: string
  formatRange: DraftFormatRange
}): DraftReplacement | null {
  const blockRange = getCurrentDraftBlockRange(draftText, formatRange.start)

  if (
    formatRange.start < blockRange.start ||
    formatRange.end > blockRange.end
  ) {
    return null
  }

  const blockText = draftText.slice(blockRange.start, blockRange.end)

  if (!getHeadingDraftText(blockText.trim())) {
    return null
  }

  return {
    start: blockRange.start,
    end: blockRange.end,
    text: stripAllDraftMarkers(blockText),
  }
}

function getBoldToggleReplacement({
  draftText,
  formatRange,
}: {
  draftText: string
  formatRange: DraftFormatRange
}): DraftReplacement | null {
  if (!formatRange.isExactSelection) {
    return getWholeBlockBoldToggleReplacement({ draftText, formatRange })
  }

  for (const boldRange of getBoldRanges(draftText)) {
    if (
      formatRange.start === boldRange.start &&
      formatRange.end === boldRange.end
    ) {
      return {
        start: boldRange.start,
        end: boldRange.end,
        text: boldRange.innerText,
      }
    }

    if (
      formatRange.start >= boldRange.innerStart &&
      formatRange.end <= boldRange.innerEnd
    ) {
      return {
        start: boldRange.start,
        end: boldRange.end,
        text: getPartiallyUnboldedText({
          draftText,
          boldRange,
          selectionStart: formatRange.start,
          selectionEnd: formatRange.end,
        }),
      }
    }
  }

  return null
}

function getWholeBlockBoldToggleReplacement({
  draftText,
  formatRange,
}: {
  draftText: string
  formatRange: DraftFormatRange
}): DraftReplacement | null {
  const blockText = draftText.slice(formatRange.start, formatRange.end)

  if (!getWholeBoldDraftText(blockText.trim())) {
    return null
  }

  return {
    start: formatRange.start,
    end: formatRange.end,
    text: stripBlockDraftMarkers(blockText),
  }
}

function getFormatReplacement({
  draftText,
  format,
  formatRange,
}: {
  draftText: string
  format: AboutDraftFormat
  formatRange: DraftFormatRange
}): DraftReplacement {
  return {
    start: formatRange.start,
    end: formatRange.end,
    text: formatDraftSelection({
      format,
      isExactSelection: formatRange.isExactSelection,
      selectionText: draftText.slice(formatRange.start, formatRange.end),
      suffix: draftText.slice(formatRange.end),
      prefix: draftText.slice(0, formatRange.start),
    }),
  }
}

function formatDraftSelection({
  format,
  isExactSelection,
  selectionText,
  suffix,
  prefix,
}: {
  format: AboutDraftFormat
  isExactSelection: boolean
  prefix: string
  selectionText: string
  suffix: string
}) {
  if (!selectionText.trim()) {
    return format === "heading" ? "# " : format === "bold" ? "** **" : ""
  }

  if (format === "heading") {
    return withBlockBoundaries({
      formattedText: formatDraftBlocks(selectionText, format),
      isExactSelection,
      prefix,
      suffix,
    })
  }

  return formatDraftBlocks(selectionText, format)
}

function formatDraftBlocks(blockText: string, format: AboutDraftFormat) {
  return blockText
    .split(/(\n{2,})/)
    .map((part) => {
      if (/^\n{2,}$/.test(part)) {
        return part
      }

      return formatDraftBlock(part, format)
    })
    .join("")
}

function formatDraftBlock(blockText: string, format: AboutDraftFormat) {
  const text = stripBlockDraftMarkers(blockText)

  if (!text) {
    return ""
  }

  if (format === "heading") {
    return `# ${stripAllDraftMarkers(text)}`
  }

  if (format === "bold") {
    return `**${stripAllDraftMarkers(text)}**`
  }

  return stripAllDraftMarkers(text)
}

function normalizeDraftSpacing(draftText: string) {
  return draftText.replace(/\n{4,}/g, "\n\n\n")
}

export { applyDraftFormat }
export type { AboutDraftFormat }
