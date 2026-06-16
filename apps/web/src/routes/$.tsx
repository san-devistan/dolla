import { NotFoundPage } from "@/components/not-found-page"
import { NOINDEX_ROBOTS, createNoindexSeoHead } from "@/lib/seo"
import { createFileRoute, notFound } from "@tanstack/react-router"

export const Route = createFileRoute("/$")({
  loader: () => {
    throw notFound({
      headers: {
        "X-Robots-Tag": NOINDEX_ROBOTS,
      },
    })
  },
  head: () => createNoindexSeoHead("Page introuvable | Dolla Shashin"),
  headers: () => ({
    "X-Robots-Tag": NOINDEX_ROBOTS,
  }),
  notFoundComponent: NotFoundPage,
  component: NotFoundPage,
})
