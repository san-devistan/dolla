import type {
  CloudinaryCategoryPage,
  CloudinaryHome,
} from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"

import { escapeXml, getAbsoluteUrl } from "./utils"

type SitemapEntry = {
  changeFrequency?: "daily" | "weekly" | "monthly" | "yearly"
  path: string
  priority?: number
}

function createSitemapXml(entries: SitemapEntry[]) {
  const urls = entries.map(createSitemapUrlXml).join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

function getStaticSitemapEntries() {
  return [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/mariage", changeFrequency: "monthly", priority: 0.9 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
    { path: "/pricing.txt", changeFrequency: "monthly", priority: 0.4 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  ] satisfies SitemapEntry[]
}

function getCategorySitemapEntries(home: CloudinaryHome | undefined) {
  if (!home) {
    return []
  }

  return home.categories.map((category) => ({
    path: `/${toMediaRouteSegment(category.name)}`,
    changeFrequency: "monthly" as const,
    priority: category.isDirectPhotoCategory ? 0.9 : 0.8,
  }))
}

function getShootSitemapEntries(category: CloudinaryCategoryPage | undefined) {
  if (!category?.category) {
    return []
  }

  return category.shoots.map((shoot) => ({
    path: `/${toMediaRouteSegment(category.category?.name || shoot.categoryName)}/${toMediaRouteSegment(shoot.name)}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
}

function createSitemapUrlXml(entry: SitemapEntry) {
  const changeFrequency = entry.changeFrequency
    ? `<changefreq>${entry.changeFrequency}</changefreq>`
    : ""
  const priority =
    typeof entry.priority === "number"
      ? `<priority>${entry.priority.toFixed(1)}</priority>`
      : ""

  return [
    "  <url>",
    `    <loc>${escapeXml(getAbsoluteUrl(entry.path))}</loc>`,
    changeFrequency ? `    ${changeFrequency}` : "",
    priority ? `    ${priority}` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n")
}

export {
  createSitemapXml,
  getCategorySitemapEntries,
  getShootSitemapEntries,
  getStaticSitemapEntries,
}
export type { SitemapEntry }
