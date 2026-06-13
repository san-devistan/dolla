import instagramIconUrl from "@/assets/socials/instagram.svg"
import pinterestIconUrl from "@/assets/socials/pinterest.svg"
import tiktokIconUrl from "@/assets/socials/tiktok.svg"
import type {
  ContactSettings,
  ContactSocialKind,
  ContactSocialLink,
} from "@/lib/contact.server"
import { Separator } from "@workspace/ui/components/separator"
import { LinkIcon } from "lucide-react"

const SOCIAL_ICON_URLS = {
  instagram: instagramIconUrl,
  tiktok: tiktokIconUrl,
  pinterest: pinterestIconUrl,
  custom: null,
} satisfies Record<ContactSocialKind, string | null>

function ContactInfo({ settings }: { settings: ContactSettings }) {
  return (
    <section className="flex w-full min-w-0 flex-col items-center justify-center gap-8 md:min-w-[360px] md:gap-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-sans text-xl font-semibold tracking-[0.08em] uppercase">
          {settings.reservationTitle}
        </h1>
        <a
          href={`mailto:${settings.reservationEmail}`}
          className="font-heading text-lg transition-colors hover:text-brand"
        >
          {settings.reservationEmail}
        </a>
      </div>
      <Separator className="max-w-xs bg-black/35" />
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-sans text-xl font-semibold tracking-[0.08em] uppercase">
          {settings.socialsTitle}
        </h1>
        <ContactSocialLinks links={settings.socialLinks} />
      </div>
    </section>
  )
}

function ContactSocialLinks({ links }: { links: ContactSocialLink[] }) {
  if (links.length === 0) {
    return null
  }

  return (
    <section className="group/socials flex items-center gap-4">
      {links.map((social) => {
        const iconUrl = SOCIAL_ICON_URLS[social.kind]

        return (
          <a
            key={social.id}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            aria-label={social.label}
            className="flex size-5 items-center justify-center transition-opacity duration-200 group-hover/socials:opacity-50 hover:!opacity-100"
          >
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={social.label}
                width={20}
                height={20}
                className="size-5 dark:invert"
              />
            ) : (
              <LinkIcon className="size-4" />
            )}
          </a>
        )
      })}
    </section>
  )
}

export { ContactInfo }
