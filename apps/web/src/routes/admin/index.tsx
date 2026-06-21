import { getCloudinaryHomeFn } from "@/features/cloudinary/data/functions"
import { DollaHomePage } from "@/features/cloudinary/home/_pages/page"
import { requireAdminAuth } from "@/lib/admin-route-auth"
import { createNoindexSeoHead } from "@/lib/seo"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  loader: () => getCloudinaryHomeFn({ data: {} }),
  head: () => createNoindexSeoHead("Admin | Dolla Shashin"),
  component: AdminHomePage,
})

function AdminHomePage() {
  const initialHome = Route.useLoaderData()

  return <DollaHomePage initialHome={initialHome} isAdminMode />
}
