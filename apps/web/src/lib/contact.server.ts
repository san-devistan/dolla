import { api } from "@workspace/backend/api"
import { ConvexHttpClient } from "convex/browser"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

type LocalEnv = Record<string, string>
type ContactSocialKind = "instagram" | "tiktok" | "pinterest" | "custom"
type ContactSocialLink = {
  id: string
  kind: ContactSocialKind
  label: string
  href: string
}
type ContactSettings = {
  reservationTitle: string
  reservationEmail: string
  socialsTitle: string
  socialLinks: ContactSocialLink[]
  formTitle: string
  notificationRecipients: string[]
}
type ContactRecipientsInput = {
  notificationRecipients: string[]
}
type ContactConnection = {
  configured: boolean
  missingKeys: string[]
  error?: string
}
type ContactSettingsState = {
  connection: ContactConnection
  settings: ContactSettings
}
type ContactMessageInput = {
  name: string
  email: string
  message: string
}

const DEFAULT_CONTACT_SETTINGS = {
  reservationTitle: "RESERVATION",
  reservationEmail: "dollashashin@gmail.com",
  socialsTitle: "RESEAUX SOCIAUX",
  socialLinks: [
    {
      id: "instagram",
      kind: "instagram",
      label: "Instagram",
      href: "https://www.instagram.com/dollashashin?igsh=MTFqMTcwd3llaW1kNw==",
    },
    {
      id: "tiktok",
      kind: "tiktok",
      label: "TikTok",
      href: "https://www.tiktok.com/@dollashashin?_t=ZN-8xTVkuiTEbG&_r=1",
    },
    {
      id: "pinterest",
      kind: "pinterest",
      label: "Pinterest",
      href: "https://pin.it/4livaNVaP",
    },
  ],
  formTitle: "CONTACTEZ-MOI",
  notificationRecipients: [
    "lcombaret1@gmail.com",
    "limamdounia75@gmail.com",
    "dollashashin@gmail.com",
  ],
} satisfies ContactSettings

let localEnvCache: LocalEnv | null = null

async function getContactSettings(): Promise<ContactSettingsState> {
  const client = getConvexContactClient()

  if (!client) {
    return {
      connection: getMissingConvexConnection(),
      settings: getDefaultContactSettings(),
    }
  }

  try {
    const settings = await client.query(api.contact.getContactSettings, {})

    return {
      connection: {
        configured: true,
        missingKeys: [],
      },
      settings: mapContactSettings(settings),
    }
  } catch (error) {
    return {
      connection: {
        configured: true,
        missingKeys: [],
        error: getErrorMessage(error),
      },
      settings: getDefaultContactSettings(),
    }
  }
}

async function setContactSettings(settings: ContactRecipientsInput) {
  const client = getRequiredConvexContactClient()
  const savedSettings = await client.mutation(
    api.contact.setContactSettings,
    settings
  )

  return mapContactSettings(savedSettings)
}

async function submitContactMessage(message: ContactMessageInput) {
  const client = getRequiredConvexContactClient()

  return await client.mutation(api.contact.submitContactMessage, message)
}

function getDefaultContactSettings(): ContactSettings {
  return {
    ...DEFAULT_CONTACT_SETTINGS,
    socialLinks: DEFAULT_CONTACT_SETTINGS.socialLinks.map((link) => ({
      ...link,
    })),
    notificationRecipients: [
      ...DEFAULT_CONTACT_SETTINGS.notificationRecipients,
    ],
  }
}

function mapContactSettings(value: unknown): ContactSettings {
  if (!isRecord(value)) {
    return getDefaultContactSettings()
  }

  const notificationRecipients = readStringArray(
    value,
    "notificationRecipients"
  )

  return {
    ...getDefaultContactSettings(),
    notificationRecipients:
      notificationRecipients.length > 0
        ? notificationRecipients
        : [...DEFAULT_CONTACT_SETTINGS.notificationRecipients],
  }
}

function getConvexContactClient() {
  const convexUrl =
    readServerEnv("CONVEX_URL") || readServerEnv("VITE_CONVEX_URL")

  if (!convexUrl) {
    return null
  }

  return new ConvexHttpClient(convexUrl, { logger: false })
}

function getRequiredConvexContactClient() {
  const client = getConvexContactClient()

  if (!client) {
    throw new Error(
      "CONVEX_URL or VITE_CONVEX_URL is required for contact form actions."
    )
  }

  return client
}

function getMissingConvexConnection(): ContactConnection {
  return {
    configured: false,
    missingKeys: ["CONVEX_URL", "VITE_CONVEX_URL"],
  }
}

function getLocalEnv(): LocalEnv {
  if (localEnvCache) {
    return localEnvCache
  }

  localEnvCache = {}

  for (const file of getLocalEnvFiles()) {
    if (!existsSync(file)) {
      continue
    }

    Object.assign(localEnvCache, parseEnvFile(readFileSync(file, "utf8")))
  }

  return localEnvCache
}

function getLocalEnvFiles() {
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, ".env"),
    path.join(cwd, ".env.local"),
    path.join(cwd, "apps/web/.env"),
    path.join(cwd, "apps/web/.env.local"),
    path.join(cwd, "packages/backend/.env"),
    path.join(cwd, "packages/backend/.env.local"),
    path.resolve(cwd, "../..", ".env"),
    path.resolve(cwd, "../..", ".env.local"),
    path.resolve(cwd, "../..", "apps/web/.env"),
    path.resolve(cwd, "../..", "apps/web/.env.local"),
    path.resolve(cwd, "../..", "packages/backend/.env"),
    path.resolve(cwd, "../..", "packages/backend/.env.local"),
  ]

  return Array.from(new Set(candidates))
}

function parseEnvFile(contents: string): LocalEnv {
  const values: LocalEnv = {}

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)

    if (!match) {
      continue
    }

    const key = match[1]
    const value = match[2]

    if (!key || value === undefined) {
      continue
    }

    values[key] = normalizeEnvValue(value)
  }

  return values
}

function normalizeEnvValue(rawValue: string) {
  const value = rawValue.trim()
  const quote = value[0]

  if (
    (quote === `"` || quote === `'`) &&
    value.length >= 2 &&
    value.endsWith(quote)
  ) {
    return value.slice(1, -1)
  }

  const commentIndex = value.search(/\s#/)

  if (commentIndex === -1) {
    return value
  }

  return value.slice(0, commentIndex).trim()
}

function readServerEnv(name: string) {
  return process.env[name] || getLocalEnv()[name]
}

function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null
}

function readStringArray(value: unknown, key: string) {
  return readArray(value, key).filter(
    (item): item is string => typeof item === "string"
  )
}

function readArray(value: unknown, key: string) {
  if (!isRecord(value)) {
    return []
  }

  const property = Reflect.get(value, key)

  return Array.isArray(property) ? property : []
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Contact settings failed."
}

export { getContactSettings, setContactSettings, submitContactMessage }
export type {
  ContactConnection,
  ContactMessageInput,
  ContactRecipientsInput,
  ContactSettings,
  ContactSettingsState,
  ContactSocialKind,
  ContactSocialLink,
}
