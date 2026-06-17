import { v } from "convex/values"

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { resend } from "./email"

const CONTACT_SETTINGS_KEY = "contact"
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254
const MAX_MESSAGE_LENGTH = 5000
const MAX_SETTING_TEXT_LENGTH = 180
const MAX_NOTIFICATION_RECIPIENTS = 8

const contactSettingsValidator = v.object({
  notificationRecipients: v.array(v.string()),
})

type ContactSocialKind = "instagram" | "tiktok" | "pinterest"
type ContactSocialLink = {
  id: ContactSocialKind
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
  notificationFrom: string
  notificationRecipients: string[]
  notificationSubject: string
}

type ContactMessage = {
  name: string
  email: string
  message: string
}

const DEFAULT_CONTACT_CONTENT = {
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
  notificationFrom: "Contact Form <contact@dollashashin.com>",
  notificationSubject: "Nouveau message sur dollashashin.com",
} satisfies Omit<ContactSettings, "notificationRecipients">

const DEFAULT_NOTIFICATION_RECIPIENTS = [
  "lcombaret1@gmail.com",
  "limamdounia75@gmail.com",
  "dollashashin@gmail.com",
] satisfies string[]

const DEFAULT_CONTACT_SETTINGS = {
  ...DEFAULT_CONTACT_CONTENT,
  notificationRecipients: [...DEFAULT_NOTIFICATION_RECIPIENTS],
} satisfies ContactSettings

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const getContactSettings = query({
  args: {},
  handler: async (ctx) => {
    return await getStoredContactSettings(ctx)
  },
})

export const setContactSettings = mutation({
  args: contactSettingsValidator,
  handler: async (ctx, args) => {
    const notificationRecipients = normalizeContactRecipients(
      args.notificationRecipients
    )
    const existing = await getContactSettingsDoc(ctx)

    if (existing) {
      await ctx.db.patch(existing["_id"], {
        notificationRecipients,
      })
    } else {
      await ctx.db.insert("contactSettings", {
        key: CONTACT_SETTINGS_KEY,
        notificationRecipients,
      })
    }

    return {
      ...DEFAULT_CONTACT_CONTENT,
      notificationRecipients,
    }
  },
})

export const submitContactMessage = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const message = normalizeContactMessage(args)
    const settings = await getStoredContactSettings(ctx)
    const emailId = await resend.sendEmail(ctx, {
      from: settings.notificationFrom,
      to: settings.notificationRecipients,
      subject: settings.notificationSubject,
      html: renderContactEmailHtml(message),
      text: renderContactEmailText(message),
      replyTo: [message.email],
    })

    return {
      emailId,
    }
  },
})

async function getStoredContactSettings(
  ctx: QueryCtx | MutationCtx
): Promise<ContactSettings> {
  const settings = await getContactSettingsDoc(ctx)

  if (!settings) {
    return {
      ...getDefaultContactSettings(),
    }
  }

  return {
    ...DEFAULT_CONTACT_CONTENT,
    socialLinks: DEFAULT_CONTACT_CONTENT.socialLinks.map((link) => ({
      ...link,
    })),
    notificationRecipients: settings.notificationRecipients,
  }
}

async function getContactSettingsDoc(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("contactSettings")
    .withIndex("by_key", (q) => q.eq("key", CONTACT_SETTINGS_KEY))
    .unique()
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

function normalizeContactRecipients(notificationRecipients: string[]) {
  const recipients = normalizeEmailList(
    notificationRecipients,
    "Recipient email"
  )

  if (recipients.length === 0) {
    throw new Error("Add at least one notification recipient.")
  }

  return recipients
}

function normalizeContactMessage(message: ContactMessage): ContactMessage {
  return {
    name: normalizeShortText(message.name, "Name", MAX_NAME_LENGTH),
    email: normalizeEmail(message.email, "Email"),
    message: normalizeLongText(message.message, "Message", MAX_MESSAGE_LENGTH),
  }
}

function normalizeEmailList(emails: string[], label: string) {
  return emails
    .slice(0, MAX_NOTIFICATION_RECIPIENTS)
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => normalizeEmail(email, label))
}

function normalizeEmail(value: string, label: string) {
  const email = normalizeShortText(value, label, MAX_EMAIL_LENGTH)

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error(`${label} must be a valid email address.`)
  }

  return email
}

function normalizeShortText(
  value: string,
  label: string,
  maxLength = MAX_SETTING_TEXT_LENGTH
) {
  const text = value.trim()

  if (!text) {
    throw new Error(`${label} is required.`)
  }

  if (text.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or less.`)
  }

  return text
}

function normalizeLongText(value: string, label: string, maxLength: number) {
  const text = value.trim()

  if (!text) {
    throw new Error(`${label} is required.`)
  }

  if (text.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or less.`)
  }

  return text
}

function renderContactEmailHtml(message: ContactMessage) {
  return [
    "<h1>Tu as recu un nouveau message sur dollashashin.com!</h1>",
    `<h3>Nom: ${escapeHtml(message.name)}</h3>`,
    `<h3>Email: ${escapeHtml(message.email)}</h3>`,
    `<h3>Message:</h3>`,
    `<p>${escapeHtml(message.message).replace(/\n/g, "<br />")}</p>`,
  ].join("")
}

function renderContactEmailText(message: ContactMessage) {
  return [
    "Tu as recu un nouveau message sur dollashashin.com!",
    "",
    `Nom: ${message.name}`,
    `Email: ${message.email}`,
    "",
    "Message:",
    message.message,
  ].join("\n")
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
