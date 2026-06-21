import { getCloudinaryShootFn } from "@/features/cloudinary/data/functions"
import { ShootPage } from "@/features/cloudinary/shoot/_pages/page"
import { requireAdminAuth } from "@/lib/admin-route-auth"
import { createNoindexSeoHead } from "@/lib/seo"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/$category/$shoot")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  loader: ({ params }) =>
    getCloudinaryShootFn({
      data: {
        categoryName: params.category,
        shootName: params.shoot,
      },
    }),
  head: () => createNoindexSeoHead("Admin shoot | Dolla Shashin"),
  component: AdminShootPage,
})

function AdminShootPage() {
  const initialShootPage = Route.useLoaderData()
  const params = Route.useParams()

  return (
    <ShootPage
      initialShootPage={initialShootPage}
      isAdminMode
      params={params}
    />
  )
}
