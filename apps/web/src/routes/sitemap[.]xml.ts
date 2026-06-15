import {
  getCloudinaryCategory,
  getCloudinaryHome,
} from "@/lib/cloudinary.server"
import {
  createSitemapXml,
  getCategorySitemapEntries,
  getShootSitemapEntries,
  getStaticSitemapEntries,
  type SitemapEntry,
} from "@/lib/seo"
import { createFileRoute } from "@tanstack/react-router"

const SITEMAP_HEADERS = {
  "Cache-Control": "public, max-age=3600",
  "Content-Type": "application/xml; charset=utf-8",
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const home = await getCloudinaryHome()
        const categoryPages = await Promise.all(
          home.categories
            .filter((category) => !category.isDirectPhotoCategory)
            .map((category) => getCloudinaryCategory(category.name))
        )
        const entries = uniqueSitemapEntries([
          ...getStaticSitemapEntries(),
          ...getCategorySitemapEntries(home),
          ...categoryPages.flatMap((category) =>
            getShootSitemapEntries(category)
          ),
        ])

        return new Response(createSitemapXml(entries), {
          headers: SITEMAP_HEADERS,
        })
      },
    },
  },
})

function uniqueSitemapEntries(entries: SitemapEntry[]) {
  const entriesByPath = new Map<string, SitemapEntry>()

  for (const entry of entries) {
    entriesByPath.set(entry.path, entry)
  }

  return Array.from(entriesByPath.values())
}
