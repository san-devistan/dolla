import instagramIconUrl from "@/assets/socials/instagram.svg"
import pinterestIconUrl from "@/assets/socials/pinterest.svg"
import tiktokIconUrl from "@/assets/socials/tiktok.svg"

type SocialId = "instagram" | "tiktok" | "pinterest"
type SocialLink = {
  id: SocialId
  href: string
  iconUrl: string
  label: string
}

const socialLinks = [
  {
    id: "instagram",
    href: "https://www.instagram.com/dollashashin?igsh=MTFqMTcwd3llaW1kNw==",
    iconUrl: instagramIconUrl,
    label: "Instagram",
  },
  {
    id: "tiktok",
    href: "https://www.tiktok.com/@dollashashin?_t=ZN-8xTVkuiTEbG&_r=1",
    iconUrl: tiktokIconUrl,
    label: "TikTok",
  },
  {
    id: "pinterest",
    href: "https://pin.it/4livaNVaP",
    iconUrl: pinterestIconUrl,
    label: "Pinterest",
  },
] satisfies SocialLink[]

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="flex h-[10vh] w-full items-center justify-between px-4 md:px-8">
      <section className="flex flex-col items-start font-heading text-sm leading-tight">
        <p className="font-bold lining-nums">
          &copy; {currentYear}, DOLLA SHASHIN
        </p>
        <p>All Rights Reserved</p>
      </section>
      <Socials />
    </footer>
  )
}

function Socials() {
  return (
    <section className="group/socials flex items-center gap-4">
      {socialLinks.map((social) => (
        <a
          key={social.id}
          href={social.href}
          target="_blank"
          rel="noreferrer"
          aria-label={social.label}
        >
          <img
            src={social.iconUrl}
            alt={social.label}
            width={20}
            height={20}
            className="size-5 transition-opacity duration-200 group-hover/socials:opacity-50 hover:!opacity-100"
          />
        </a>
      ))}
    </section>
  )
}

export { Footer, Socials }
