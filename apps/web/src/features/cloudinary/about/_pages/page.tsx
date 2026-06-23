import {
  AboutEditor,
  AboutImage,
} from "@/features/cloudinary/about/_components/page-sections"
import { AboutText } from "@/features/cloudinary/about/_components/text"
import {
  parseAboutDraft,
  serializeAboutBlocks,
} from "@/features/cloudinary/about/_lib/draft-formatting"
import {
  getCloudinaryAboutFn,
  setCloudinaryAboutContentFn,
} from "@/features/cloudinary/data/functions"
import { GalleryHeader } from "@/features/cloudinary/navigation/_components/gallery-header"
import { uploadAdminCloudinaryFiles } from "@/features/cloudinary/uploads/admin"
import type { CloudinaryAbout } from "@/lib/cloudinary.server"
import { useServerFn } from "@tanstack/react-start"
import { toast } from "@workspace/ui/lib/toast"
import { cn } from "@workspace/ui/lib/utils"
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"

function AboutPage({
  initialAbout,
  isAdminMode,
}: {
  initialAbout: CloudinaryAbout
  isAdminMode: boolean
}) {
  const resetKey = useMemo(() => getAboutPageKey(initialAbout), [initialAbout])

  return (
    <AboutPageContent
      key={resetKey}
      initialAbout={initialAbout}
      isAdminMode={isAdminMode}
    />
  )
}

function AboutPageContent({
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

  const saveAboutContent = useCallback(async () => {
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
  }, [draftText, getAbout, setAboutContent])

  const replaceAboutImage = useCallback(
    async (file: File) => {
      if (file.type && !file.type.toLowerCase().startsWith("image/")) {
        toast.error("Choose an image file.")
        return
      }

      setIsBusy(true)

      try {
        await uploadAdminCloudinaryFiles({
          files: [file],
          target: "about-image",
        })

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
    },
    [getAbout]
  )

  const handleSaveAboutContent = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void saveAboutContent()
    },
    [saveAboutContent]
  )

  const handleAboutImageUploadClick = useCallback(() => {
    aboutImageInputRef.current?.click()
  }, [])

  const handleAboutImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]

      if (!file) {
        return
      }

      void replaceAboutImage(file)
    },
    [replaceAboutImage]
  )

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

function getAboutPageKey(about: CloudinaryAbout) {
  return JSON.stringify({
    content: about.content,
    image: about.image?.assetId,
  })
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed."
}

export { AboutPage }
