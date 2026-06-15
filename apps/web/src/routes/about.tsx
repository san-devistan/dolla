import {
  parseAboutDraft,
  serializeAboutBlocks,
} from "@/features/cloudinary/about-draft-formatting"
import {
  AboutRichTextEditor,
  type AboutRichTextEditorHandle,
} from "@/features/cloudinary/about-rich-text-editor"
import { AboutText } from "@/features/cloudinary/about-text"
import {
  getCloudinaryAboutFn,
  setCloudinaryAboutContentFn,
} from "@/features/cloudinary/cloudinary.functions"
import { GalleryHeader } from "@/features/cloudinary/gallery-header"
import { ProgressiveImage } from "@/features/cloudinary/progressive-image"
import type {
  CloudinaryAbout,
  CloudinaryAsset,
  CloudinaryConnection,
} from "@/lib/cloudinary.server"
import { createAboutSeoHead } from "@/lib/seo"
import { createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
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
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"

export const Route = createFileRoute("/about")({
  loader: () => getCloudinaryAboutFn(),
  head: ({ loaderData }) => createAboutSeoHead(loaderData?.image),
  component: PublicAboutPage,
})

function PublicAboutPage() {
  const initialAbout = Route.useLoaderData()

  return <AboutPage initialAbout={initialAbout} isAdminMode={false} />
}

function AboutPage({
  initialAbout,
  isAdminMode,
}: {
  initialAbout: CloudinaryAbout
  isAdminMode: boolean
}) {
  const [about, setAbout] = useState<CloudinaryAbout>(initialAbout)
  const [draftText, setDraftText] = useState(() =>
    serializeAboutBlocks(initialAbout.content)
  )
  const [isBusy, setIsBusy] = useState(false)
  const aboutImageInputRef = useRef<HTMLInputElement>(null)

  const getAbout = useServerFn(getCloudinaryAboutFn)
  const setAboutContent = useServerFn(setCloudinaryAboutContentFn)
  const canReplaceAboutImage =
    isAdminMode && about.connection.configured && !about.connection.error

  useEffect(() => {
    setAbout(initialAbout)
    setDraftText(serializeAboutBlocks(initialAbout.content))
    setIsBusy(false)
  }, [initialAbout])

  function handleSaveAboutContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveAboutContent()
  }

  function handleAboutImageUploadClick() {
    aboutImageInputRef.current?.click()
  }

  function handleAboutImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    void replaceAboutImage(file)
  }

  async function saveAboutContent() {
    const nextBlocks = parseAboutDraft(draftText)

    setIsBusy(true)

    try {
      await setAboutContent({ data: { blocks: nextBlocks } })

      const nextAbout = await getAbout()

      setAbout(nextAbout)
      setDraftText(serializeAboutBlocks(nextAbout.content))
      toast.success("About page saved")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }

  async function replaceAboutImage(file: File) {
    if (file.type && !file.type.toLowerCase().startsWith("image/")) {
      toast.error("Choose an image file.")
      return
    }

    const formData = new FormData()

    formData.set("target", "about-image")
    formData.append("files", file)
    setIsBusy(true)

    try {
      const response = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(getUploadError(result) || "Upload failed.")
      }

      const nextAbout = await getAbout()

      setAbout(nextAbout)
      toast.success("About image updated")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      if (aboutImageInputRef.current) {
        aboutImageInputRef.current.value = ""
      }

      setIsBusy(false)
    }
  }

  return (
    <main className="flex min-h-[90svh] flex-col bg-background text-foreground">
      <GalleryHeader categories={about.categories} isAdminMode={isAdminMode} />
      <section
        className={cn(
          "mx-auto flex w-full max-w-[1540px] flex-col gap-6 px-4 md:flex-row md:gap-8 md:px-8",
          isAdminMode
            ? "items-start pt-2 pb-8 md:pt-6"
            : "flex-1 items-center py-10"
        )}
      >
        <AboutImage
          connection={about.connection}
          image={about.image}
          inputRef={aboutImageInputRef}
          isBusy={isBusy}
          canReplaceImage={canReplaceAboutImage}
          isAdminMode={isAdminMode}
          onImageFileChange={handleAboutImageFileChange}
          onUploadClick={handleAboutImageUploadClick}
        />
        {isAdminMode ? (
          <AboutEditor
            draftText={draftText}
            isBusy={isBusy}
            onSave={handleSaveAboutContent}
            onUpdateDraft={setDraftText}
          />
        ) : (
          <AboutText blocks={about.content} />
        )}
      </section>
    </main>
  )
}

export { AboutPage }

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
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editorRef.current?.applyFormat("heading")}
          >
            <Heading2Icon data-icon="inline-start" />
            Header
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editorRef.current?.applyFormat("bold")}
          >
            <BoldIcon data-icon="inline-start" />
            Bold
          </Button>
        </div>
      </form>
    </section>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed."
}

function getUploadError(result: unknown) {
  if (!result || typeof result !== "object") {
    return ""
  }

  const error = Reflect.get(result, "error")

  return typeof error === "string" ? error : ""
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
