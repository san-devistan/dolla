import { NotFoundPage } from "@/components/not-found-page"
import { CategoryPage } from "@/features/cloudinary/category/_pages/page"
import { getCloudinaryCategoryFn } from "@/features/cloudinary/data/functions"
import {
  NOINDEX_ROBOTS,
  createCategorySeoHead,
  createNoindexSeoHead,
} from "@/lib/seo"
import { createFileRoute, notFound } from "@tanstack/react-router"

export const Route = createFileRoute("/$category")({
  loader: async ({ params }) => {
    const categoryPage = await getCloudinaryCategoryFn({
      data: { categoryName: params.category },
    })

    if (!categoryPage.category) {
      throw notFound({
        headers: {
          "X-Robots-Tag": NOINDEX_ROBOTS,
        },
      })
    }

    return categoryPage
  },
  head: ({ loaderData, match, matches, params }) => {
    if (isNotFoundRouteMatch(match)) {
      return createNoindexSeoHead("Page introuvable | Dolla Shashin")
    }

    const leafMatch = matches.at(-1)

    if (leafMatch?.id !== match.id) {
      return {}
    }

    return createCategorySeoHead(loaderData, params.category)
  },
  headers: ({ match }) =>
    isNotFoundRouteMatch(match)
      ? {
          "X-Robots-Tag": NOINDEX_ROBOTS,
        }
      : undefined,
  notFoundComponent: NotFoundPage,
  component: PublicCategoryPage,
})

function isNotFoundRouteMatch(match: { status?: string }) {
  return match.status === "notFound"
}

function PublicCategoryPage() {
  const initialCategoryPage = Route.useLoaderData()
  const { category } = Route.useParams()

  if (!initialCategoryPage) {
    throw new Error("Category failed to load.")
  }

  return (
    <CategoryPage
      category={category}
      initialCategoryPage={initialCategoryPage}
      isAdminMode={false}
    />
  )
}
