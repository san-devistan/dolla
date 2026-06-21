import {
  GalleryHeader,
  type GalleryCategory,
} from "@/features/cloudinary/navigation/_components/gallery-header"
import { ContactAdminPanel } from "@/features/contact/admin-panel"
import { ContactForm } from "@/features/contact/form"
import { setContactSettingsFn } from "@/features/contact/functions"
import { ContactInfo } from "@/features/contact/info"
import type { ContactConnection, ContactSettings } from "@/lib/contact.server"
import { useServerFn } from "@tanstack/react-start"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import { type FormEvent, useCallback, useMemo, useState } from "react"

type ContactPageProps = {
  categories: GalleryCategory[]
  contactConnection: ContactConnection
  initialSettings: ContactSettings
  isAdminMode: boolean
  mediaConnection: ContactConnection
}

function ContactPage({
  categories,
  contactConnection,
  initialSettings,
  isAdminMode,
  mediaConnection,
}: ContactPageProps) {
  const resetKey = useMemo(
    () => JSON.stringify(initialSettings),
    [initialSettings]
  )

  return (
    <ContactPageContent
      key={resetKey}
      categories={categories}
      contactConnection={contactConnection}
      initialSettings={initialSettings}
      isAdminMode={isAdminMode}
      mediaConnection={mediaConnection}
    />
  )
}

function ContactPageContent({
  categories,
  contactConnection,
  initialSettings,
  isAdminMode,
  mediaConnection,
}: ContactPageProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [draftRecipients, setDraftRecipients] = useState(
    () => initialSettings.notificationRecipients
  )
  const [isSaving, setIsSaving] = useState(false)
  const setContactSettings = useServerFn(setContactSettingsFn)

  const handleChangeRecipients = useCallback((value: string) => {
    setDraftRecipients(parseRecipientList(value))
  }, [])
  const saveContactSettings = useCallback(async () => {
    setIsSaving(true)

    try {
      const savedSettings = await setContactSettings({
        data: {
          notificationRecipients: draftRecipients,
        },
      })

      setSettings(savedSettings)
      setDraftRecipients(savedSettings.notificationRecipients)
      toast.success("Contact page saved")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }, [draftRecipients, setContactSettings])
  const handleSaveSettings = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void saveContactSettings()
    },
    [saveContactSettings]
  )

  return (
    <main className="flex min-h-[90svh] flex-col bg-background text-foreground">
      <GalleryHeader categories={categories} isAdminMode={isAdminMode} />
      <section
        className={cn(
          "mx-auto flex w-full max-w-[1000px] flex-col items-center gap-10 px-4 md:flex-row md:px-8",
          isAdminMode ? "pt-5 pb-14" : "flex-1 justify-center py-10"
        )}
      >
        <h1 className="sr-only">Contact photographe Paris</h1>
        <ContactInfo settings={settings} />
        <ContactForm formTitle={settings.formTitle} />
      </section>
      {isAdminMode ? (
        <ContactAdminPanel
          contactConnection={contactConnection}
          draftRecipients={draftRecipients}
          isSaving={isSaving}
          mediaConnection={mediaConnection}
          onChangeRecipients={handleChangeRecipients}
          onSave={handleSaveSettings}
        />
      ) : null}
    </main>
  )
}

function parseRecipientList(value: string) {
  return value.split(/\r?\n|,/).flatMap((email) => {
    const trimmedEmail = email.trim()

    return trimmedEmail ? [trimmedEmail] : []
  })
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed."
}

export { ContactPage }
