import { getCloudinaryCategoryFn } from "@/features/cloudinary/cloudinary.functions"
import { requireAdminAuth } from "@/lib/admin-route-auth"
import { createNoindexSeoHead } from "@/lib/seo"
import { CategoryPage } from "@/routes/$category"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/$category")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  loader: ({ params }) =>
    getCloudinaryCategoryFn({
      data: { categoryName: params.category },
    }),
  head: () => createNoindexSeoHead("Admin galerie | Dolla Shashin"),
  component: AdminCategoryPage,
})

function AdminCategoryPage() {
  const initialCategoryPage = Route.useLoaderData()
  const { category } = Route.useParams()

  return (
    <CategoryPage
      category={category}
      initialCategoryPage={initialCategoryPage}
      isAdminMode
    />
  )
}
