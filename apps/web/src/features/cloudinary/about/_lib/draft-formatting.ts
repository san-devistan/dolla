import {
  applyDraftFormat,
  type AboutDraftFormat,
} from "@/features/cloudinary/about/_lib/draft-apply-format"
import {
  getAboutBlockId,
  getHeadingDraftText,
  getInlineTextSegments,
  getWholeBoldDraftText,
  stripAllDraftMarkers,
  stripBlockDraftMarkers,
  stripHeadingMarker,
  type InlineTextSegment,
} from "@/features/cloudinary/about/_lib/draft-markers"
import type { AboutContentBlock } from "@/lib/cloudinary.server"

function serializeAboutBlocks(blocks: AboutContentBlock[]) {
  const serializedBlocks = []

  for (const block of blocks) {
    const serializedBlock = serializeAboutBlock(block)

    if (serializedBlock) {
      serializedBlocks.push(serializedBlock)
    }
  }

  return serializedBlocks.join("\n\n")
}

function parseAboutDraft(draftText: string): AboutContentBlock[] {
  const blocks = []

  for (const [index, blockText] of draftText.split(/\n{2,}/).entries()) {
    const block = parseAboutDraftBlock(blockText, index)

    if (block) {
      blocks.push(block)
    }
  }

  return blocks
}

function getDisplayText(block: AboutContentBlock) {
  if (block.kind === "heading" || block.bold) {
    return stripAllDraftMarkers(block.text)
  }

  return stripHeadingMarker(block.text)
}

function serializeAboutBlock(block: AboutContentBlock) {
  const text =
    block.kind === "heading" || block.bold
      ? stripAllDraftMarkers(block.text)
      : stripHeadingMarker(block.text)

  if (!text) {
    return ""
  }

  if (block.kind === "heading") {
    return `# ${text}`
  }

  if (block.bold) {
    return `**${text}**`
  }

  return text
}

function parseAboutDraftBlock(
  blockText: string,
  index: number
): AboutContentBlock | null {
  const normalizedText = blockText.trim()

  if (!normalizedText) {
    return null
  }

  const headingText = getHeadingDraftText(normalizedText)

  if (headingText) {
    return {
      id: getAboutBlockId(index, headingText),
      kind: "heading",
      text: stripAllDraftMarkers(headingText),
      bold: false,
    }
  }

  const boldText = getWholeBoldDraftText(normalizedText)

  if (boldText) {
    return {
      id: getAboutBlockId(index, boldText),
      kind: "paragraph",
      text: stripBlockDraftMarkers(boldText),
      bold: true,
    }
  }

  return {
    id: getAboutBlockId(index, normalizedText),
    kind: "paragraph",
    text: stripHeadingMarker(normalizedText),
    bold: false,
  }
}

export {
  applyDraftFormat,
  getDisplayText,
  getInlineTextSegments,
  parseAboutDraft,
  serializeAboutBlocks,
}
export type { AboutDraftFormat, InlineTextSegment }
