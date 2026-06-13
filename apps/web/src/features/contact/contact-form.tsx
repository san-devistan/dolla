import { submitContactMessageFn } from "@/features/contact/contact.functions"
import { useServerFn } from "@tanstack/react-start"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Textarea } from "@workspace/ui/components/textarea"
import { SendIcon } from "lucide-react"
import {
  type ChangeEventHandler,
  type FormEvent,
  useCallback,
  useState,
} from "react"

type ContactFormData = {
  name: string
  email: string
  message: string
}

type SubmitStatus = "idle" | "loading" | "success" | "error"

type ContactTextFieldProps = {
  id: string
  label: string
  onChange: ChangeEventHandler<HTMLInputElement>
  placeholder: string
  type: "email" | "text"
  value: string
}

type ContactMessageFieldProps = {
  onChange: ChangeEventHandler<HTMLTextAreaElement>
  value: string
}

const EMPTY_CONTACT_FORM_DATA = {
  name: "",
  email: "",
  message: "",
} satisfies ContactFormData

function ContactForm({ formTitle }: { formTitle: string }) {
  const [formData, setFormData] = useState<ContactFormData>(
    EMPTY_CONTACT_FORM_DATA
  )
  const [status, setStatus] = useState<SubmitStatus>("idle")
  const submitContactMessage = useServerFn(submitContactMessageFn)

  const handleNameChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setFormData((currentFormData) => ({
        ...currentFormData,
        name: event.target.value,
      }))
    },
    []
  )
  const handleEmailChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      setFormData((currentFormData) => ({
        ...currentFormData,
        email: event.target.value,
      }))
    },
    []
  )
  const handleMessageChange = useCallback<
    ChangeEventHandler<HTMLTextAreaElement>
  >((event) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      message: event.target.value,
    }))
  }, [])
  const submitContactForm = useCallback(async () => {
    setStatus("loading")

    try {
      await submitContactMessage({ data: formData })
      setStatus("success")
      setFormData(EMPTY_CONTACT_FORM_DATA)
    } catch (error) {
      setStatus("error")
      toast.error(getErrorMessage(error))
    }
  }, [formData, submitContactMessage])
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void submitContactForm()
    },
    [submitContactForm]
  )

  return (
    <section className="flex w-full min-w-0 flex-col items-center justify-center md:min-w-[360px]">
      <h1 className="mb-8 font-sans text-xl font-semibold tracking-[0.08em] uppercase">
        {formTitle}
      </h1>
      <form
        className="flex w-full max-w-xs flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <FieldGroup className="gap-4">
          <ContactTextField
            id="contact-name"
            label="Nom"
            type="text"
            placeholder="Martin Dupont"
            value={formData.name}
            onChange={handleNameChange}
          />
          <ContactTextField
            id="contact-email"
            label="Email"
            type="email"
            placeholder="martin@dupont.com"
            value={formData.email}
            onChange={handleEmailChange}
          />
          <ContactMessageField
            value={formData.message}
            onChange={handleMessageChange}
          />
        </FieldGroup>
        <Button
          type="submit"
          className="mt-1 w-full"
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            "Chargement..."
          ) : (
            <>
              <SendIcon data-icon="inline-start" />
              Envoyer
            </>
          )}
        </Button>
        <ContactStatusMessage status={status} />
      </form>
    </section>
  )
}

function ContactTextField({
  id,
  label,
  onChange,
  placeholder,
  type,
  value,
}: ContactTextFieldProps) {
  return (
    <Field className="gap-1">
      <FieldLabel htmlFor={id} className="font-heading font-bold">
        {label}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        required
        value={value}
        onChange={onChange}
      />
    </Field>
  )
}

function ContactMessageField({ onChange, value }: ContactMessageFieldProps) {
  return (
    <Field className="gap-1">
      <FieldLabel htmlFor="contact-message" className="font-heading font-bold">
        Message
      </FieldLabel>
      <Textarea
        id="contact-message"
        placeholder="Je souhaite reserver pour un mariage..."
        required
        rows={4}
        value={value}
        onChange={onChange}
      />
    </Field>
  )
}

function ContactStatusMessage({ status }: { status: SubmitStatus }) {
  if (status === "success") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Message sent successfully!
      </p>
    )
  }

  if (status === "error") {
    return (
      <p className="text-center text-sm text-destructive">
        Failed to send message. Please try again.
      </p>
    )
  }

  return null
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed."
}

export { ContactForm }
