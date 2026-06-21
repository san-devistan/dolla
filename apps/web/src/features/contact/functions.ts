import { assertAdminAuthenticated } from "@/lib/admin-auth.server"
import { getCloudinaryHome } from "@/lib/cloudinary.server"
import {
  setContactSettings,
  submitContactMessage,
  type ContactRecipientsInput,
  getContactSettings,
} from "@/lib/contact.server"
import { createServerFn } from "@tanstack/react-start"

function getStringField(data: unknown, key: string, fallback = "") {
  if (!data || typeof data !== "object") {
    return fallback
  }

  const value = Reflect.get(data, key)

  return typeof value === "string" ? value : fallback
}

function getStringArrayField(data: unknown, key: string) {
  if (!data || typeof data !== "object") {
    return []
  }

  const value = Reflect.get(data, key)

  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === "string")
}

const getContactSettingsInput = (data: unknown): ContactRecipientsInput => ({
  notificationRecipients: getStringArrayField(data, "notificationRecipients"),
})

const getContactMessageInput = (data: unknown) => ({
  name: getStringField(data, "name"),
  email: getStringField(data, "email"),
  message: getStringField(data, "message"),
})

const getContactPageFn = createServerFn({ method: "GET" }).handler(async () => {
  const [home, contact] = await Promise.all([
    getCloudinaryHome(),
    getContactSettings(),
  ])

  return {
    categories: home.categories,
    contactConnection: contact.connection,
    mediaConnection: home.connection,
    settings: contact.settings,
  }
})

const setContactSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(getContactSettingsInput)
  .handler(async ({ data }) => {
    assertAdminAuthenticated()

    return await setContactSettings(data)
  })

const submitContactMessageFn = createServerFn({ method: "POST" })
  .inputValidator(getContactMessageInput)
  .handler(async ({ data }) => await submitContactMessage(data))

export { getContactPageFn, setContactSettingsFn, submitContactMessageFn }
