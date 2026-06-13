import { getCloudinaryHomeFn } from "@/features/cloudinary/cloudinary.functions"
import { requireAdminAuth } from "@/lib/admin-route-auth"
import { DollaHomePage } from "@/routes/index"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/media")({
  beforeLoad: ({ location }) => requireAdminAuth(location),
  loader: () => getCloudinaryHomeFn({ data: {} }),
  component: AdminMediaPage,
})

function AdminMediaPage() {
  const initialHome = Route.useLoaderData()

  return <DollaHomePage initialHome={initialHome} isAdminMode />
}
