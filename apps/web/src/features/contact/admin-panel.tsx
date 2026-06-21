import type { ContactConnection } from "@/lib/contact.server"
import { Alert } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"
import { AlertTriangleIcon, SaveIcon } from "lucide-react"
import { type ChangeEventHandler, type FormEvent, useCallback } from "react"

type ContactAdminPanelProps = {
  contactConnection: ContactConnection
  draftRecipients: string[]
  isSaving: boolean
  mediaConnection: ContactConnection
  onChangeRecipients: (value: string) => void
  onSave: (event: FormEvent<HTMLFormElement>) => void
}

function ContactAdminPanel({
  contactConnection,
  draftRecipients,
  isSaving,
  mediaConnection,
  onChangeRecipients,
  onSave,
}: ContactAdminPanelProps) {
  const recipientText = draftRecipients.join("\n")
  const handleRecipientsChange = useCallback<
    ChangeEventHandler<HTMLTextAreaElement>
  >(
    (event) => {
      onChangeRecipients(event.target.value)
    },
    [onChangeRecipients]
  )

  return (
    <section className="mx-auto w-full max-w-[1000px] px-4 pb-16 md:px-8">
      <ConnectionWarnings
        contactConnection={contactConnection}
        mediaConnection={mediaConnection}
      />
      <form className="border-t border-black/20 pt-8" onSubmit={onSave}>
        <FieldSet className="max-w-xl">
          <FieldLegend>Email routing</FieldLegend>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="notification-recipients">
                Recipients
              </FieldLabel>
              <Textarea
                id="notification-recipients"
                disabled={isSaving}
                rows={4}
                value={recipientText}
                onChange={handleRecipientsChange}
              />
            </Field>
          </FieldGroup>
        </FieldSet>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={isSaving}>
            <SaveIcon data-icon="inline-start" />
            Save
          </Button>
        </div>
      </form>
    </section>
  )
}

function ConnectionWarnings({
  contactConnection,
  mediaConnection,
}: {
  contactConnection: ContactConnection
  mediaConnection: ContactConnection
}) {
  const warnings = [
    getConnectionWarning("Contact backend", contactConnection),
    getConnectionWarning("Media navigation", mediaConnection),
  ].filter((warning): warning is string => Boolean(warning))

  if (warnings.length === 0) {
    return null
  }

  return (
    <Alert className="mb-5 flex items-start gap-3 border-destructive/30 bg-destructive/5 text-sm">
      <AlertTriangleIcon
        className="mt-0.5 size-4 shrink-0 text-destructive"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        {warnings.map((warning) => (
          <p key={warning} className="text-muted-foreground">
            {warning}
          </p>
        ))}
      </div>
    </Alert>
  )
}

function getConnectionWarning(label: string, connection: ContactConnection) {
  if (!connection.configured) {
    return `${label} missing server env: ${connection.missingKeys.join(", ")}.`
  }

  if (connection.error) {
    return `${label}: ${connection.error}`
  }

  return null
}

export { ContactAdminPanel }
