import { NotFoundPage } from "@/components/not-found-page"
import { getCloudinaryShootFn } from "@/features/cloudinary/data/functions"
import { ShootPage } from "@/features/cloudinary/shoot/_pages/page"
import {
  NOINDEX_ROBOTS,
  createNoindexSeoHead,
  createShootSeoHead,
} from "@/lib/seo"
import { createFileRoute, notFound } from "@tanstack/react-router"

export const Route = createFileRoute("/$category/$shoot")({
  loader: async ({ params }) => {
    const shootPage = await getCloudinaryShootFn({
      data: {
        categoryName: params.category,
        shootName: params.shoot,
      },
    })

    if (!shootPage.category || !shootPage.shoot) {
      throw notFound({
        headers: {
          "X-Robots-Tag": NOINDEX_ROBOTS,
        },
      })
    }

    return shootPage
  },
  head: ({ loaderData, match, params }) =>
    isNotFoundRouteMatch(match)
      ? createNoindexSeoHead("Page introuvable | Dolla Shashin")
      : createShootSeoHead(loaderData, params.category, params.shoot),
  headers: ({ match }) =>
    isNotFoundRouteMatch(match)
      ? {
          "X-Robots-Tag": NOINDEX_ROBOTS,
        }
      : undefined,
  notFoundComponent: NotFoundPage,
  component: PublicShootPage,
})

function isNotFoundRouteMatch(match: { status?: string }) {
  return match.status === "notFound"
}

function PublicShootPage() {
  const initialShootPage = Route.useLoaderData()
  const params = Route.useParams()

  if (!initialShootPage) {
    throw new Error("Shoot failed to load.")
  }

  return (
    <ShootPage
      initialShootPage={initialShootPage}
      isAdminMode={false}
      params={params}
    />
  )
}
