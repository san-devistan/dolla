import {
  applyDraftFormat,
  type AboutDraftFormat,
} from "@/features/cloudinary/about-draft-formatting"
import {
  getDraftTextFromEditor,
  getFallbackSelectionRange,
  renderDraftTextToEditor,
  type DraftSelectionRange,
} from "@/features/cloudinary/about-rich-text-editor-dom"
import {
  getEditorSelectionDraftRange,
  restoreEditorSelection,
} from "@/features/cloudinary/about-rich-text-editor-selection"
import { cn } from "@workspace/ui/lib/utils"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type Ref,
} from "react"

type AboutRichTextEditorHandle = {
  applyFormat: (format: AboutDraftFormat) => void
}

const AboutRichTextEditor = forwardRef(function AboutRichTextEditor(
  {
    className,
    disabled,
    draftText,
    onUpdateDraft,
  }: {
    className?: string
    disabled: boolean
    draftText: string
    onUpdateDraft: (draftText: string) => void
  },
  ref: Ref<AboutRichTextEditorHandle>
) {
  const { editorRef, handleEditorKeyDown, syncDraftFromEditor } =
    useAboutRichTextEditorController({
      disabled,
      draftText,
      onUpdateDraft,
      ref,
    })

  return (
    <div
      ref={editorRef}
      aria-label="About text"
      aria-multiline="true"
      className={cn(
        "min-h-[520px] resize-y overflow-auto border border-black p-4 font-heading text-base leading-snug text-foreground outline-none md:text-lg",
        "focus-visible:ring-[3px] focus-visible:ring-ring/30",
        className
      )}
      contentEditable={!disabled}
      role="textbox"
      suppressContentEditableWarning
      tabIndex={0}
      onInput={syncDraftFromEditor}
      onKeyDown={handleEditorKeyDown}
    />
  )
})

function useAboutRichTextEditorController({
  disabled,
  draftText,
  onUpdateDraft,
  ref,
}: {
  disabled: boolean
  draftText: string
  onUpdateDraft: (draftText: string) => void
  ref: Ref<AboutRichTextEditorHandle>
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const domDraftRef = useRef<string | null>(null)
  const pendingSelectionRef = useRef<DraftSelectionRange | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      applyFormat(format) {
        const editor = editorRef.current

        if (!editor || disabled) {
          return
        }

        const currentDraftText = getDraftTextFromEditor(editor) || draftText
        const selectionRange =
          getEditorSelectionDraftRange(editor, currentDraftText) ??
          getFallbackSelectionRange(currentDraftText)
        const result = applyDraftFormat({
          draftText: currentDraftText,
          format,
          selectionEnd: selectionRange.selectionEnd,
          selectionStart: selectionRange.selectionStart,
        })

        pendingSelectionRef.current = {
          selectionEnd: result.selectionEnd,
          selectionStart: result.selectionStart,
        }
        onUpdateDraft(result.text)
      },
    }),
    [disabled, draftText, onUpdateDraft]
  )

  useEffect(() => {
    const editor = editorRef.current

    if (!editor || domDraftRef.current === draftText) {
      return
    }

    renderDraftTextToEditor(editor, draftText)
    domDraftRef.current = draftText
  }, [draftText])

  useEffect(() => {
    const pendingSelection = pendingSelectionRef.current
    const editor = editorRef.current

    if (!pendingSelection || !editor) {
      return
    }

    pendingSelectionRef.current = null

    window.requestAnimationFrame(() => {
      restoreEditorSelection(editor, draftText, pendingSelection)
    })
  }, [draftText])

  const syncDraftFromEditor = useCallback(() => {
    const editor = editorRef.current

    if (!editor) {
      return
    }

    const nextDraftText = getDraftTextFromEditor(editor)

    domDraftRef.current = nextDraftText
    onUpdateDraft(nextDraftText)
  }, [onUpdateDraft])

  const insertLineBreakAtSelection = useCallback(
    (isSoftBreak: boolean) => {
      const editor = editorRef.current

      if (!editor) {
        return
      }

      const currentDraftText = getDraftTextFromEditor(editor) || draftText
      const selectionRange =
        getEditorSelectionDraftRange(editor, currentDraftText) ??
        getFallbackSelectionRange(currentDraftText)
      const insertedText = isSoftBreak
        ? "\n"
        : getEnterInsertedText({ currentDraftText, selectionRange })
      const result = insertTextIntoDraft({
        currentDraftText,
        insertedText,
        selectionRange,
      })

      pendingSelectionRef.current = {
        selectionEnd: result.selectionEnd,
        selectionStart: result.selectionStart,
      }
      onUpdateDraft(result.text)
    },
    [draftText, onUpdateDraft]
  )

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter") {
        return
      }

      event.preventDefault()
      insertLineBreakAtSelection(event.shiftKey)
    },
    [insertLineBreakAtSelection]
  )

  return { editorRef, handleEditorKeyDown, syncDraftFromEditor }
}

function getEnterInsertedText({
  currentDraftText,
  selectionRange,
}: {
  currentDraftText: string
  selectionRange: DraftSelectionRange
}) {
  return isSelectionInHeadingBlock(currentDraftText, selectionRange)
    ? "\n\n"
    : "\n"
}

function isSelectionInHeadingBlock(
  draftText: string,
  selectionRange: DraftSelectionRange
) {
  const blockText = getDraftBlockTextAtOffset(
    draftText,
    selectionRange.selectionStart
  )

  return /^#{1,2}\s+/.test(blockText.trim())
}

function getDraftBlockTextAtOffset(draftText: string, draftOffset: number) {
  const blocks = draftText.split(/\n\n/)
  let currentOffset = 0

  for (const block of blocks) {
    const blockEnd = currentOffset + block.length

    if (draftOffset <= blockEnd) {
      return block
    }

    currentOffset = blockEnd + 2
  }

  return blocks.at(-1) ?? ""
}

function insertTextIntoDraft({
  currentDraftText,
  insertedText,
  selectionRange,
}: {
  currentDraftText: string
  insertedText: string
  selectionRange: DraftSelectionRange
}) {
  const rawText = `${currentDraftText.slice(
    0,
    selectionRange.selectionStart
  )}${insertedText}${currentDraftText.slice(selectionRange.selectionEnd)}`
  const text = normalizeDraftTextAfterEditorInsertion(rawText)
  const selection = Math.max(
    0,
    selectionRange.selectionStart +
      insertedText.length +
      text.length -
      rawText.length
  )

  return {
    selectionEnd: selection,
    selectionStart: selection,
    text,
  }
}

function normalizeDraftTextAfterEditorInsertion(draftText: string) {
  const blocks = draftText.split(/\n\n/)
  const normalizedBlocks: string[] = []

  for (const [index, block] of blocks.entries()) {
    const trimmedBlock = block.trim()

    if (/^#{1,2}$/.test(trimmedBlock)) {
      const nextBlock = blocks[index + 1]

      normalizedBlocks.push("")

      if (nextBlock?.trim()) {
        blocks[index + 1] = `${trimmedBlock} ${nextBlock.trimStart()}`
      }

      continue
    }

    if (trimmedBlock === "**") {
      const previousBlock = normalizedBlocks.at(-1)
      const nextBlock = blocks[index + 1]

      if (previousBlock?.trim().startsWith("**")) {
        normalizedBlocks[normalizedBlocks.length - 1] = `${previousBlock}**`
        normalizedBlocks.push("")
        continue
      }

      normalizedBlocks.push("")

      if (nextBlock?.trim()) {
        blocks[index + 1] = `**${nextBlock.trimStart()}`
      }

      continue
    }

    normalizedBlocks.push(block)
  }

  return normalizedBlocks.join("\n\n")
}

export { AboutRichTextEditor }
export type { AboutRichTextEditorHandle }
