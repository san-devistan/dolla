import {
  AboutRichTextEditor,
  type AboutRichTextEditorHandle,
} from "@/features/cloudinary/about/_components/rich-text-editor"
import { ProgressiveImage } from "@/features/cloudinary/media/_components/progressive-image"
import type {
  CloudinaryAsset,
  CloudinaryConnection,
} from "@/lib/cloudinary.server"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  AlertTriangleIcon,
  BoldIcon,
  Heading2Icon,
  ImageUpIcon,
  SaveIcon,
} from "lucide-react"
import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type RefObject,
  useCallback,
  useRef,
} from "react"

function AboutImage({
  canReplaceImage,
  connection,
  image,
  inputRef,
  isBusy,
  isAdminMode,
  onImageFileChange,
  onUploadClick,
}: {
  canReplaceImage: boolean
  connection: CloudinaryConnection
  image?: CloudinaryAsset
  inputRef: RefObject<HTMLInputElement | null>
  isBusy: boolean
  isAdminMode: boolean
  onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onUploadClick: () => void
}) {
  const connectionIssue = getConnectionIssue(connection)

  return (
    <figure className="w-full shrink-0 md:w-[min(30vw,420px)]">
      <div className="relative aspect-[7/10] w-full overflow-hidden border border-black bg-muted">
        {image ? (
          <ProgressiveImage
            src={image.previewUrl}
            placeholderSrc={image.thumbnailUrl}
            alt="Dounia, Dolla Shashin"
            className="absolute inset-0 size-full object-cover"
            fetchPriority="high"
            loading="eager"
          />
        ) : (
          <div className="flex size-full items-center justify-center px-6 text-center font-heading text-sm text-muted-foreground">
            Image unavailable
          </div>
        )}
      </div>
      {isAdminMode ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canReplaceImage || isBusy}
            onClick={onUploadClick}
          >
            <ImageUpIcon data-icon="inline-start" />
            Replace image
          </Button>
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            tabIndex={-1}
            disabled={!canReplaceImage || isBusy}
            onChange={onImageFileChange}
          />
        </div>
      ) : null}
      {isAdminMode && connectionIssue ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-destructive">
          <AlertTriangleIcon className="size-3.5" />
          {connectionIssue}
        </p>
      ) : null}
    </figure>
  )
}

function AboutEditor({
  draftText,
  isBusy,
  onSave,
  onUpdateDraft,
}: {
  draftText: string
  isBusy: boolean
  onSave: (event: FormEvent<HTMLFormElement>) => void
  onUpdateDraft: (draftText: string) => void
}) {
  const editorRef = useRef<AboutRichTextEditorHandle>(null)
  const handleFormatMouseDown = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
    },
    []
  )
  const handleHeadingClick = useCallback(() => {
    editorRef.current?.applyFormat("heading")
  }, [])
  const handleBoldClick = useCallback(() => {
    editorRef.current?.applyFormat("bold")
  }, [])

  return (
    <section className="min-w-0 flex-1 px-0 md:px-8">
      <form onSubmit={onSave}>
        <AboutRichTextEditor
          ref={editorRef}
          disabled={isBusy}
          draftText={draftText}
          onUpdateDraft={onUpdateDraft}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={isBusy}>
            <SaveIcon data-icon="inline-start" />
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onMouseDown={handleFormatMouseDown}
            onClick={handleHeadingClick}
          >
            <Heading2Icon data-icon="inline-start" />
            Header
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onMouseDown={handleFormatMouseDown}
            onClick={handleBoldClick}
          >
            <BoldIcon data-icon="inline-start" />
            Bold
          </Button>
        </div>
      </form>
    </section>
  )
}

function getConnectionIssue(connection: CloudinaryConnection) {
  if (connection.error) {
    return connection.error
  }

  if (!connection.configured) {
    return `Missing Cloudinary configuration: ${connection.missingKeys.join(
      ", "
    )}`
  }

  return ""
}

export { AboutEditor, AboutImage }
