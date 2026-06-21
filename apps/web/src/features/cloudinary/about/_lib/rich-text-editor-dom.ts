import {
  getDisplayText,
  getInlineTextSegments,
  parseAboutDraft,
  serializeAboutBlocks,
} from "@/features/cloudinary/about/_lib/draft-formatting"
import type { AboutContentBlock } from "@/lib/cloudinary.server"
import { cn } from "@workspace/ui/lib/utils"

type DraftSelectionRange = {
  selectionEnd: number
  selectionStart: number
}

const ABOUT_EDITOR_BLOCK_SELECTOR = "[data-about-editor-block]"
const PARAGRAPH_CLASS_NAME =
  "mb-3 min-h-[1lh] text-base leading-snug whitespace-pre-wrap md:text-lg"
const EMPTY_PARAGRAPH_CLASS_NAME =
  "mb-3 min-h-[1lh] text-base leading-snug whitespace-pre-wrap md:text-lg"
const HEADING_CLASS_NAME =
  "mt-4 mb-4 min-h-[1lh] text-lg leading-none font-semibold tracking-[0.1em] text-foreground first:mt-0 md:text-2xl"
const STRONG_CLASS_NAME = "text-foreground"

function renderDraftTextToEditor(editor: HTMLElement, draftText: string) {
  const blocks = parseEditorDraftBlocks(draftText)
  const fragment = document.createDocumentFragment()

  for (const [index, block] of blocks.entries()) {
    if (!block.trim()) {
      fragment.append(createEditorParagraphElement(index))
      continue
    }

    const parsedBlock = parseAboutDraft(block)[0]

    if (!parsedBlock) {
      fragment.append(createEditorParagraphElement(index))
      continue
    }

    const displayText = getEditorDisplayText(block, parsedBlock)

    if (parsedBlock.kind === "heading") {
      fragment.append(createEditorHeadingElement(index, displayText))
      continue
    }

    fragment.append(
      createEditorParagraphElement(index, displayText, parsedBlock.bold)
    )
  }

  editor.replaceChildren(fragment)
}

function getDraftTextFromEditor(editor: HTMLElement) {
  const draftBlocks: string[] = []

  for (const blockElement of getEditorBlockElements(editor)) {
    draftBlocks.push(getDraftBlockTextFromElement(blockElement))
  }

  return draftBlocks.join("\n\n").replace(/^\n+|\n+$/g, "")
}

function getEditorBlockElements(editor: HTMLElement) {
  const blockElements: HTMLElement[] = []

  for (const child of Array.from(editor.childNodes)) {
    if (child instanceof HTMLElement) {
      blockElements.push(child)
      continue
    }

    if (child.textContent?.trim()) {
      const wrapper = document.createElement("p")
      wrapper.textContent = child.textContent
      blockElements.push(wrapper)
    }
  }

  return blockElements
}

function getSerializedDraftBlocks(draftText: string) {
  return parseEditorDraftBlocks(draftText).map((blockText) => {
    const block = parseAboutDraft(blockText)[0]

    return block ? serializeAboutBlocks([block]) : ""
  })
}

function parseEditorDraftBlocks(draftText: string) {
  return draftText ? draftText.split(/\n\n/) : [""]
}

function getDraftBlockStartOffsets(draftBlocks: string[]) {
  let currentOffset = 0

  return draftBlocks.map((blockText) => {
    const blockOffset = currentOffset
    currentOffset += blockText.length + 2

    return blockOffset
  })
}

function getDraftOffsetForDisplayOffset(
  draftBlockText: string,
  displayOffset: number
) {
  let currentDisplayOffset = 0
  let draftOffset = getHiddenDraftPrefixLength(draftBlockText)

  while (draftOffset < draftBlockText.length) {
    if (draftBlockText.startsWith("**", draftOffset)) {
      draftOffset += 2
      continue
    }

    if (currentDisplayOffset === displayOffset) {
      return draftOffset
    }

    currentDisplayOffset += 1
    draftOffset += 1
  }

  return draftOffset
}

function getDisplayOffsetForDraftOffset(
  draftBlockText: string,
  draftOffset: number
) {
  let displayOffset = 0
  let currentDraftOffset = getHiddenDraftPrefixLength(draftBlockText)
  const normalizedDraftOffset = Math.max(draftOffset, currentDraftOffset)

  while (
    currentDraftOffset < normalizedDraftOffset &&
    currentDraftOffset < draftBlockText.length
  ) {
    if (draftBlockText.startsWith("**", currentDraftOffset)) {
      currentDraftOffset += 2
      continue
    }

    displayOffset += 1
    currentDraftOffset += 1
  }

  return displayOffset
}

function getFallbackSelectionRange(draftText: string): DraftSelectionRange {
  return {
    selectionEnd: draftText.length,
    selectionStart: draftText.length,
  }
}

function getDraftBlockTextFromElement(blockElement: HTMLElement) {
  const kind = getEditorBlockKind(blockElement)
  const text = trimHorizontalWhitespace(
    collectDraftText(blockElement, {
      allowBold: kind === "paragraph",
      isBold: false,
    })
  )

  if (!text.trim()) {
    return ""
  }

  if (kind === "heading") {
    return `# ${stripDraftMarkers(text)}`
  }

  return text
}

function getEditorDisplayText(
  draftBlockText: string,
  block: AboutContentBlock
) {
  const displayText = getDisplayText(block)

  if (block.kind === "heading") {
    return displayText
  }

  return `${getLeadingSoftBreaks(draftBlockText)}${displayText}${getTrailingSoftBreaks(draftBlockText)}`
}

function getLeadingSoftBreaks(text: string) {
  return text.match(/^\n+/)?.[0] ?? ""
}

function getTrailingSoftBreaks(text: string) {
  return text.match(/\n+$/)?.[0] ?? ""
}

function trimHorizontalWhitespace(text: string) {
  return text.replace(/^[\t ]+|[\t ]+$/g, "")
}

function getEditorBlockKind(blockElement: HTMLElement) {
  if (
    blockElement.dataset.aboutEditorKind === "heading" ||
    /^H[1-6]$/.test(blockElement.tagName)
  ) {
    return "heading"
  }

  return "paragraph"
}

function collectDraftText(
  node: Node,
  {
    allowBold,
    isBold,
  }: {
    allowBold: boolean
    isBold: boolean
  }
): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.replace(/\u00a0/g, " ").replace(/\r/g, "") ?? ""
  }

  if (!(node instanceof HTMLElement)) {
    return ""
  }

  if (node.tagName === "BR") {
    return "\n"
  }

  const startsBold = allowBold && !isBold && isBoldElement(node)
  const childText = Array.from(node.childNodes)
    .map((child) =>
      collectDraftText(child, {
        allowBold,
        isBold: isBold || startsBold,
      })
    )
    .join("")

  if (startsBold && childText.trim()) {
    return `**${stripDraftMarkers(childText)}**`
  }

  return childText
}

function createEditorHeadingElement(index: number, text: string) {
  const heading = document.createElement("h2")
  heading.className = HEADING_CLASS_NAME
  heading.dataset.aboutEditorBlock = String(index)
  heading.dataset.aboutEditorKind = "heading"
  appendTextOrBreak(heading, text)

  return heading
}

function createEditorParagraphElement(
  index: number,
  text = "",
  isBold = false
) {
  const paragraph = document.createElement("p")
  paragraph.className = cn(
    text ? PARAGRAPH_CLASS_NAME : EMPTY_PARAGRAPH_CLASS_NAME,
    isBold && "font-semibold text-foreground"
  )
  paragraph.dataset.aboutEditorBlock = String(index)
  paragraph.dataset.aboutEditorKind = "paragraph"

  if (isBold && text) {
    const strong = document.createElement("strong")
    strong.className = STRONG_CLASS_NAME
    strong.textContent = text
    paragraph.append(strong)
    return paragraph
  }

  if (!text) {
    paragraph.append(document.createElement("br"))
    return paragraph
  }

  for (const segment of getInlineTextSegments(text)) {
    const element = document.createElement(segment.bold ? "strong" : "span")

    if (segment.bold) {
      element.className = STRONG_CLASS_NAME
    }

    element.textContent = segment.text
    paragraph.append(element)
  }

  return paragraph
}

function appendTextOrBreak(element: HTMLElement, text: string) {
  if (text) {
    element.textContent = text
    return
  }

  element.append(document.createElement("br"))
}

function isBoldElement(element: HTMLElement) {
  return element.tagName === "B" || element.tagName === "STRONG"
}

function getHiddenDraftPrefixLength(draftBlockText: string) {
  return draftBlockText.match(/^#{1,2}\s+/)?.[0].length ?? 0
}

function stripDraftMarkers(text: string) {
  return stripHeadingMarker(text)
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .trim()
}

function stripHeadingMarker(text: string) {
  return (text.match(/^#{1,2}\s+([\s\S]+)$/)?.[1] ?? text).trim()
}

export {
  ABOUT_EDITOR_BLOCK_SELECTOR,
  getDisplayOffsetForDraftOffset,
  getDraftBlockStartOffsets,
  getDraftOffsetForDisplayOffset,
  getDraftTextFromEditor,
  getFallbackSelectionRange,
  getSerializedDraftBlocks,
  renderDraftTextToEditor,
}
export type { DraftSelectionRange }
