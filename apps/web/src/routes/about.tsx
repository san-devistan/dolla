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
import {
  isMediaAdminMode,
  validateMediaAdminSearch,
} from "@/lib/media-admin-mode"
import { createFileRoute } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import {
  AlertTriangleIcon,
  BoldIcon,
  Heading2Icon,
  SaveIcon,
} from "lucide-react"
import { type FormEvent, useEffect, useRef, useState } from "react"

export const Route = createFileRoute("/about")({
  validateSearch: validateMediaAdminSearch,
  loader: () => getCloudinaryAboutFn(),
  head: () => ({
    meta: [
      {
        title: "A propos | Dolla Shashin",
      },
    ],
  }),
  component: AboutPage,
})

function AboutPage() {
  const initialAbout = Route.useLoaderData()
  const search = Route.useSearch()
  const isAdminMode = isMediaAdminMode(search)
  const [about, setAbout] = useState<CloudinaryAbout>(initialAbout)
  const [draftText, setDraftText] = useState(() =>
    serializeAboutBlocks(initialAbout.content)
  )
  const [isBusy, setIsBusy] = useState(false)

  const getAbout = useServerFn(getCloudinaryAboutFn)
  const setAboutContent = useServerFn(setCloudinaryAboutContentFn)

  useEffect(() => {
    setAbout(initialAbout)
    setDraftText(serializeAboutBlocks(initialAbout.content))
    setIsBusy(false)
  }, [initialAbout])

  function handleSaveAboutContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveAboutContent()
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

  return (
    <main className="min-h-svh bg-background text-foreground">
      <GalleryHeader categories={about.categories} isAdminMode={isAdminMode} />
      <section className="mx-auto flex w-full max-w-[1540px] flex-col items-start gap-6 px-4 pt-2 pb-8 md:flex-row md:gap-8 md:px-8 md:pt-6">
        <AboutImage
          connection={about.connection}
          image={about.image}
          isAdminMode={isAdminMode}
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

function AboutImage({
  connection,
  image,
  isAdminMode,
}: {
  connection: CloudinaryConnection
  image?: CloudinaryAsset
  isAdminMode: boolean
}) {
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
      {isAdminMode && connection.error ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-destructive">
          <AlertTriangleIcon className="size-3.5" />
          {connection.error}
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
