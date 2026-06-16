import { getCloudinaryHomeFn } from "@/features/cloudinary/cloudinary.functions"
import { requireAdminAuth } from "@/lib/admin-route-auth"
import { createNoindexSeoHead } from "@/lib/seo"
import { DollaHomePage } from "@/routes/index"
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
