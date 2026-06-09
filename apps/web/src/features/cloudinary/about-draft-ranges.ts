type BoldDraftRange = {
  end: number
  innerEnd: number
  innerStart: number
  innerText: string
  start: number
}

function getCurrentDraftBlockRange(draftText: string, cursorPosition: number) {
  if (!draftText) {
    return { start: 0, end: 0 }
  }

  const blockStartSeparator = draftText.lastIndexOf("\n\n", cursorPosition)
  const blockEndSeparator = draftText.indexOf("\n\n", cursorPosition)
  let start = blockStartSeparator === -1 ? 0 : blockStartSeparator + 2
  let end = blockEndSeparator === -1 ? draftText.length : blockEndSeparator

  while (draftText[start] === "\n") {
    start += 1
  }

  while (end > start && draftText[end - 1] === "\n") {
    end -= 1
  }

  return { start, end }
}

function getBoldRanges(draftText: string) {
  const boldPattern = /\*\*([\s\S]*?)\*\*/g
  const ranges: BoldDraftRange[] = []
  let match = boldPattern.exec(draftText)

  while (match) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      innerStart: match.index + 2,
      innerEnd: match.index + match[0].length - 2,
      innerText: match[1] ?? "",
    })
    match = boldPattern.exec(draftText)
  }

  return ranges
}

function getPartiallyUnboldedText({
  draftText,
  boldRange,
  selectionEnd,
  selectionStart,
}: {
  boldRange: BoldDraftRange
  draftText: string
  selectionEnd: number
  selectionStart: number
}) {
  const before = draftText.slice(boldRange.innerStart, selectionStart)
  const selected = draftText.slice(selectionStart, selectionEnd)
  const after = draftText.slice(selectionEnd, boldRange.innerEnd)

  return `${before ? `**${before}**` : ""}${selected}${after ? `**${after}**` : ""}`
}

function withBlockBoundaries({
  formattedText,
  isExactSelection,
  prefix,
  suffix,
}: {
  formattedText: string
  isExactSelection: boolean
  prefix: string
  suffix: string
}) {
  if (!isExactSelection) {
    return formattedText
  }

  const needsLeadingBreak = Boolean(prefix && !prefix.endsWith("\n\n"))
  const needsTrailingBreak = Boolean(suffix && !suffix.startsWith("\n\n"))

  return `${needsLeadingBreak ? "\n\n" : ""}${formattedText}${needsTrailingBreak ? "\n\n" : ""}`
}

export {
  getBoldRanges,
  getCurrentDraftBlockRange,
  getPartiallyUnboldedText,
  withBlockBoundaries,
}
