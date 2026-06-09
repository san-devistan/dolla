import {
  ABOUT_EDITOR_BLOCK_SELECTOR,
  getDisplayOffsetForDraftOffset,
  getDraftBlockStartOffsets,
  getDraftOffsetForDisplayOffset,
  getSerializedDraftBlocks,
  type DraftSelectionRange,
} from "@/features/cloudinary/about-rich-text-editor-dom"

type DomPoint = {
  node: Node
  offset: number
}

function getEditorSelectionDraftRange(
  editor: HTMLElement,
  draftText: string
): DraftSelectionRange | null {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0) {
    return null
  }

  const range = selection.getRangeAt(0)

  if (!editor.contains(range.commonAncestorContainer)) {
    return null
  }

  const selectionStart = getDraftOffsetFromDomPoint(
    editor,
    draftText,
    range.startContainer,
    range.startOffset
  )
  const selectionEnd = getDraftOffsetFromDomPoint(
    editor,
    draftText,
    range.endContainer,
    range.endOffset
  )

  if (selectionStart === null || selectionEnd === null) {
    return null
  }

  return {
    selectionEnd: Math.max(selectionStart, selectionEnd),
    selectionStart: Math.min(selectionStart, selectionEnd),
  }
}

function restoreEditorSelection(
  editor: HTMLElement,
  draftText: string,
  selectionRange: DraftSelectionRange
) {
  const selection = window.getSelection()
  const startPoint = getDomPointFromDraftOffset(
    editor,
    draftText,
    selectionRange.selectionStart
  )
  const endPoint = getDomPointFromDraftOffset(
    editor,
    draftText,
    selectionRange.selectionEnd
  )

  if (!selection || !startPoint || !endPoint) {
    return
  }

  const range = document.createRange()
  range.setStart(startPoint.node, startPoint.offset)
  range.setEnd(endPoint.node, endPoint.offset)
  selection.removeAllRanges()
  selection.addRange(range)
}

function getDraftOffsetFromDomPoint(
  editor: HTMLElement,
  draftText: string,
  node: Node,
  offset: number
) {
  const blockElement = getClosestEditorBlock(node)

  if (!blockElement || !editor.contains(blockElement)) {
    return null
  }

  const blockIndex = Number(blockElement.dataset.aboutEditorBlock)
  const draftBlocks = getSerializedDraftBlocks(draftText)
  const blockDraftText = draftBlocks[blockIndex]

  if (!Number.isFinite(blockIndex) || blockDraftText === undefined) {
    return null
  }

  const displayOffset = getDisplayOffsetFromDomPoint(blockElement, node, offset)
  const draftBlockStart =
    getDraftBlockStartOffsets(draftBlocks)[blockIndex] ?? 0

  return (
    draftBlockStart +
    getDraftOffsetForDisplayOffset(blockDraftText, displayOffset)
  )
}

function getClosestEditorBlock(node: Node) {
  if (node instanceof HTMLElement) {
    return node.closest<HTMLElement>(ABOUT_EDITOR_BLOCK_SELECTOR)
  }

  return node.parentElement?.closest<HTMLElement>(ABOUT_EDITOR_BLOCK_SELECTOR)
}

function getDisplayOffsetFromDomPoint(
  blockElement: HTMLElement,
  node: Node,
  offset: number
) {
  const range = document.createRange()
  range.setStart(blockElement, 0)
  range.setEnd(node, offset)

  return range.toString().length
}

function getDomPointFromDraftOffset(
  editor: HTMLElement,
  draftText: string,
  draftOffset: number
): DomPoint | null {
  const draftBlocks = getSerializedDraftBlocks(draftText)
  const blockStartOffsets = getDraftBlockStartOffsets(draftBlocks)
  const blockIndex = getDraftBlockIndexForOffset(draftBlocks, draftOffset)
  const blockElement = editor.querySelector<HTMLElement>(
    `[data-about-editor-block="${blockIndex}"]`
  )
  const blockDraftText = draftBlocks[blockIndex]
  const blockStart = blockStartOffsets[blockIndex]

  if (
    !blockElement ||
    blockDraftText === undefined ||
    blockStart === undefined
  ) {
    return null
  }

  const displayOffset = getDisplayOffsetForDraftOffset(
    blockDraftText,
    Math.max(0, draftOffset - blockStart)
  )

  return getDomPointForDisplayOffset(blockElement, displayOffset)
}

function getDomPointForDisplayOffset(
  blockElement: HTMLElement,
  displayOffset: number
): DomPoint {
  const walker = document.createTreeWalker(blockElement, NodeFilter.SHOW_TEXT)
  let textNode = getNextTextNode(walker)
  let remainingOffset = displayOffset
  let lastTextNode: Text | null = null

  while (textNode) {
    const textLength = textNode.data.length

    if (remainingOffset <= textLength) {
      return { node: textNode, offset: remainingOffset }
    }

    remainingOffset -= textLength
    lastTextNode = textNode
    textNode = getNextTextNode(walker)
  }

  if (lastTextNode) {
    return { node: lastTextNode, offset: lastTextNode.data.length }
  }

  return { node: blockElement, offset: 0 }
}

function getNextTextNode(walker: TreeWalker) {
  const nextNode = walker.nextNode()

  return nextNode instanceof Text ? nextNode : null
}

function getDraftBlockIndexForOffset(
  draftBlocks: string[],
  draftOffset: number
) {
  const blockStartOffsets = getDraftBlockStartOffsets(draftBlocks)

  for (const [index, startOffset] of blockStartOffsets.entries()) {
    const blockEndOffset = startOffset + (draftBlocks[index]?.length ?? 0)

    if (draftOffset <= blockEndOffset) {
      return index
    }
  }

  return Math.max(0, draftBlocks.length - 1)
}

export { getEditorSelectionDraftRange, restoreEditorSelection }
